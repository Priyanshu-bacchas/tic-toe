import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Chat.css";
import { apiRequest } from "../lib/api";


function Chat() {

    const navigate = useNavigate();

    // Access is granted only for this visit after a successful PIN check.
    // Leaving Chat (including browser Back) clears it, so Forward requires PIN again.
    useEffect(() => {
        return () => {
            sessionStorage.removeItem("private_chat_unlocked");
        };
    }, []);


    // =========================================================
    // USER
    // =========================================================

    const user =
        JSON.parse(localStorage.getItem("zero_user")) ||
        {
            name: "Guest",
            gameId: "#000000"
        };


    // =========================================================
    // PROFILE PHOTO
    // =========================================================

    const [profilePhoto, setProfilePhoto] = useState(null);

    useEffect(() => {
        let cancelled = false;
        apiRequest("/api/users/profile")
            .then(async data => {
                if (cancelled) return;
                let photo = data.profilePhoto || null;
                const legacyPhoto = localStorage.getItem(`profile_photo_${user.gameId}`);
                if (!photo && legacyPhoto) {
                    try {
                        await apiRequest("/api/users/profile", { method: "PUT", body: JSON.stringify({ profilePhoto: legacyPhoto }) });
                        photo = legacyPhoto;
                    } catch (error) { console.error("Old profile photo migration failed:", error.message); }
                }
                if (!cancelled) setProfilePhoto(photo);
            })
            .catch(error => console.error("Profile photo load failed:", error.message));
        return () => { cancelled = true; };
    }, []);

    const uploadProfile = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/") || file.size > 900 * 1024) {
            alert("Choose an image smaller than 900 KB.");
            e.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            if (dataUrl.length > 1200000) {
                alert("Please choose a smaller profile photo (under 900 KB).");
                return;
            }
            apiRequest("/api/users/profile", {
                method: "PUT",
                body: JSON.stringify({ profilePhoto: dataUrl })
            }).then(() => setProfilePhoto(dataUrl))
              .catch(error => alert(error.message));
        };
        reader.onerror = () => alert("Could not read this image.");
        reader.readAsDataURL(file);
        e.target.value = "";
    };


    const removeProfile = () => {

        apiRequest("/api/users/profile", {
            method: "PUT",
            body: JSON.stringify({ profilePhoto: null })
        }).then(() => setProfilePhoto(null))
          .catch(error => alert(error.message));



    };


    // =========================================================
    // SEARCH
    // =========================================================

    const [search, setSearch] = useState("");


    // =========================================================
    // FRIENDS
    // =========================================================

    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [selected, setSelected] = useState(null);

    const refreshSocialData = async () => {
        try {
            const [friendData, requestData] = await Promise.all([
                apiRequest("/api/users/friends"),
                apiRequest("/api/users/requests")
            ]);
            setFriends(friendData.friends || []);
            setSelected(current => current ? ((friendData.friends || []).find(friend => friend.id === current.id) || null) : null);
            setRequests(requestData.incoming || []);
            setOutgoingRequests(requestData.outgoing || []);
        } catch (error) {
            console.error("Social data refresh failed:", error.message);
        }
    };

    useEffect(() => {
        refreshSocialData();
        const timer = setInterval(refreshSocialData, 4000);
        return () => clearInterval(timer);
    }, []);


    // =========================================================
    // MESSAGES
    // =========================================================

    const [message, setMessage] = useState("");


    const [messages, setMessages] = useState({});
    const [chatMode, setChatMode] = useState("12h");
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [savingChatMode, setSavingChatMode] = useState(false);
    const [clearingChat, setClearingChat] = useState(false);

    useEffect(() => {
        if (!selected?.id) return;
        let cancelled = false;
        setShowChatSettings(false);
        apiRequest("/api/chat/" + selected.id + "/settings")
            .then(data => { if (!cancelled) setChatMode(data.mode === "after_seen" ? "after_seen" : "12h"); })
            .catch(error => console.error("Chat settings load failed:", error.message));
        return () => { cancelled = true; };
    }, [selected?.id]);

    const updateChatMode = async (mode) => {
        if (!selected?.id || savingChatMode) return;
        setSavingChatMode(true);
        try {
            const data = await apiRequest("/api/chat/" + selected.id + "/settings", {
                method: "PUT", body: JSON.stringify({ mode })
            });
            setChatMode(data.mode);
            setShowChatSettings(false);
        } catch (error) { alert(error.message); }
        finally { setSavingChatMode(false); }
    };

    const clearChat = async () => {
        if (!selected?.id || clearingChat) return;
        const confirmed = window.confirm(`Clear all messages with ${selected.name || "this friend"}? This permanently deletes the conversation for both of you.`);
        if (!confirmed) return;

        setClearingChat(true);
        try {
            await apiRequest("/api/chat/" + selected.id + "/messages", { method: "DELETE" });
            setMessages(previous => ({ ...previous, [selected.id]: [] }));
            setShowChatSettings(false);
        } catch (error) {
            alert(error.message || "Could not clear this chat.");
        } finally {
            setClearingChat(false);
        }
    };


    // =========================================================
    // DROPDOWNS
    // =========================================================

    const [showRequests, setShowRequests] =
        useState(true);


    const [showFriends, setShowFriends] =
        useState(true);


    // =========================================================
    // MY STATUS
    // =========================================================

    const [myStatus, setMyStatus] = useState([]);
    const [friendStatusMap, setFriendStatusMap] = useState({});

    useEffect(() => {
        let cancelled = false;
        const loadMyStatus = async () => {
            try {
                const data = await apiRequest("/api/users/status");
                let statuses = data.statuses || [];
                const legacyKey = `status_${user.gameId}`;
                const legacyRaw = localStorage.getItem(legacyKey);
                if (!statuses.length && legacyRaw) {
                    try {
                        const legacyStatuses = JSON.parse(legacyRaw);
                        for (const item of (Array.isArray(legacyStatuses) ? legacyStatuses : [])) {
                            if (typeof item.url !== "string" || !item.url.startsWith("data:")) continue;
                            await apiRequest("/api/users/status", {
                                method: "POST",
                                body: JSON.stringify({ mediaUrl: item.url, type: item.type || "image/jpeg" })
                            });
                        }
                        const migrated = await apiRequest("/api/users/status");
                        statuses = migrated.statuses || [];
                        localStorage.removeItem(legacyKey);
                    } catch (error) { console.error("Old status migration failed:", error.message); }
                }
                if (!cancelled) setMyStatus(statuses);
            } catch (error) { console.error("My status load failed:", error.message); }
        };
        loadMyStatus();
        const timer = setInterval(loadMyStatus, 10000);
        return () => { cancelled = true; clearInterval(timer); };
    }, []);

    useEffect(() => {
        if (!friends.length) { setFriendStatusMap({}); return; }
        let cancelled = false;
        const loadFriendStatuses = async () => {
            const entries = await Promise.all(friends.map(async friend => {
                try {
                    const data = await apiRequest("/api/users/" + friend.id + "/status");
                    return [friend.id, data.statuses || []];
                } catch (error) {
                    console.error("Friend status load failed:", error.message);
                    return [friend.id, []];
                }
            }));
            if (!cancelled) setFriendStatusMap(Object.fromEntries(entries));
        };
        loadFriendStatuses();
        const timer = setInterval(loadFriendStatuses, 10000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [friends]);


    // =========================================================
    // FRIEND STATUS
    // =========================================================

    const [friendStatuses, setFriendStatuses] =
        useState([]);


    const [showStatusViewer, setShowStatusViewer] =
        useState(false);


    const [statusOwner, setStatusOwner] =
        useState(null);


    const [activeStatus, setActiveStatus] =
        useState(0);


    const [statusProgress, setStatusProgress] =
        useState(0);


    const statusTimerRef =
        useRef(null);


    const videoRef =
        useRef(null);


    // =========================================================
    // REAL USER SEARCH FROM DATABASE
    // =========================================================

    const [searchUsers, setSearchUsers] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");

    useEffect(() => {
        const query = search.trim();
        if (!query) {
            setSearchUsers([]);
            setSearchError("");
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            setSearchError("");
            try {
                const result = await apiRequest(
                    "/api/users/search?q=" + encodeURIComponent(query)
                );
                if (!cancelled) {
                    setSearchUsers((result.users || []).map(found => ({
                        id: found.gameId,
                        gameId: found.gameId,
                        userId: found.id,
                        name: found.name
                    })));
                }
            } catch (error) {
                if (!cancelled) {
                    setSearchUsers([]);
                    setSearchError(error.message === "No players found." ? "" : error.message);
                }
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search]);

    const isOnline = () => false;


    // =========================================================
    // STATUS STORAGE HELPER
    // =========================================================

    const getStatusKey = (id) => {

        return `status_${id}`;

    };


    const getFriendStatuses = (friend) =>
        friend ? (friendStatusMap[friend.id] || []) : [];


    // =========================================================
    // SAVE MY STATUS
    // =========================================================

    const saveMyStatus = (data) => setMyStatus(data);


    // =========================================================
    // UPLOAD MY STATUS
    // =========================================================

    const uploadStatus = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newStatuses = [];
        let pending = files.length;
        const finishOne = () => {
            pending -= 1;
            if (pending === 0 && newStatuses.length) {
                Promise.all(newStatuses.map(status => apiRequest("/api/users/status", {
                    method: "POST",
                    body: JSON.stringify({ mediaUrl: status.url, type: status.type })
                }))).then(() => apiRequest("/api/users/status"))
                  .then(data => setMyStatus(data.statuses || []))
                  .catch(error => alert("Status upload failed: " + error.message));
            }
        };

        files.forEach(file => {
            if ((!file.type.startsWith("image/") && !file.type.startsWith("video/")) || file.size > 6 * 1024 * 1024) {
                if (file.size > 8 * 1024 * 1024) alert(file.name + " is larger than 6 MB and was skipped.");
                finishOne();
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                newStatuses.push({
                    id: Date.now() + "_" + Math.random(),
                    url: String(reader.result || ""),
                    type: file.type,
                    time: new Date().toISOString()
                });
                finishOne();
            };
            reader.onerror = finishOne;
            reader.readAsDataURL(file);
        });

        e.target.value = "";
    };


    // =========================================================
    // DELETE MY STATUS
    // =========================================================

    const deleteMyStatus = (id) => {

        apiRequest("/api/users/status/" + id, { method: "DELETE" })
            .then(() => apiRequest("/api/users/status"))
            .then(data => {
                const updated = data.statuses || [];
                setMyStatus(updated);
                setFriendStatuses(updated);
                if (!updated.length) closeStatusViewer();
            })
            .catch(error => alert(error.message));

    };


    // =========================================================
    // OPEN MY STATUS
    // =========================================================

    const openMyStatus = (index = 0) => {

        if (!myStatus.length) return;


        setStatusOwner({

            type: "mine",

            id: user.gameId,

            name: "My Status"

        });


        setFriendStatuses(myStatus);


        setActiveStatus(index);


        setStatusProgress(0);


        setShowStatusViewer(true);

    };


    // =========================================================
    // OPEN FRIEND STATUS
    // =========================================================

    const openFriendStatus = (friend) => {

        if (!friend) return;


        const statuses = getFriendStatuses(friend);

        if (!statuses.length) {
            alert(`${friend.name} has no status`);
            return;
        }


        setStatusOwner({

            type: "friend",

            id: friend.id,

            name: friend.name

        });


        setFriendStatuses(statuses);


        setActiveStatus(0);


        setStatusProgress(0);


        setShowStatusViewer(true);

    };


    // =========================================================
    // CLOSE STATUS
    // =========================================================

    const closeStatusViewer = () => {

        if (statusTimerRef.current) {

            clearTimeout(
                statusTimerRef.current
            );

            statusTimerRef.current = null;

        }


        setShowStatusViewer(false);


        setStatusOwner(null);


        setFriendStatuses([]);


        setActiveStatus(0);


        setStatusProgress(0);

    };


    // =========================================================
    // NEXT STATUS
    // =========================================================

    const nextStatus = () => {

        if (
            activeStatus <
            friendStatuses.length - 1
        ) {

            setActiveStatus(
                activeStatus + 1
            );

            setStatusProgress(0);

            return;

        }


        closeStatusViewer();

    };


    // =========================================================
    // PREVIOUS STATUS
    // =========================================================

    const previousStatus = () => {

        if (activeStatus > 0) {

            setActiveStatus(
                activeStatus - 1
            );

            setStatusProgress(0);

        }

    };


    // =========================================================
    // STATUS TIMER
    //
    // IMAGE  = 30 SEC
    // VIDEO  = ACTUAL DURATION
    // MAX    = 120 SEC
    // =========================================================

    useEffect(() => {

        if (!showStatusViewer) return;

        if (!friendStatuses.length) return;

        if (
            activeStatus < 0 ||
            activeStatus >= friendStatuses.length
        ) return;


        const currentStatus =
            friendStatuses[activeStatus];


        if (!currentStatus) return;


        // clear old timer
        if (statusTimerRef.current) {

            clearTimeout(
                statusTimerRef.current
            );

            statusTimerRef.current = null;

        }


        // VIDEO TIMER IS HANDLED
        // BY VIDEO EVENTS BELOW

        if (
            currentStatus.type &&
            currentStatus.type.startsWith("video")
        ) {

            return;

        }


        // IMAGE = 30 SECONDS

        const startTime =
            Date.now();


        const duration =
            30000;


        const update = () => {

            const elapsed =
                Date.now() - startTime;


            const progress =
                Math.min(
                    (elapsed / duration) * 100,
                    100
                );


            setStatusProgress(progress);


            if (elapsed >= duration) {

                nextStatus();

                return;

            }


            statusTimerRef.current =
                setTimeout(
                    update,
                    100
                );

        };


        update();


        return () => {

            if (
                statusTimerRef.current
            ) {

                clearTimeout(
                    statusTimerRef.current
                );

            }

        };

    }, [
        showStatusViewer,
        activeStatus,
        friendStatuses
    ]);


    // =========================================================
    // VIDEO EVENTS
    // =========================================================

    const handleVideoLoaded = (e) => {

        const video =
            e.currentTarget;


        // Start from beginning
        video.currentTime = 0;


        // 2 MIN MAX
        // Actual video duration if shorter

        const maxDuration =
            Math.min(
                video.duration,
                120
            );


        setStatusProgress(0);


        // Try autoplay
        const playPromise =
            video.play();


        if (
            playPromise &&
            playPromise.catch
        ) {

            playPromise.catch(() => {});

        }

    };


    const handleVideoTimeUpdate = (e) => {

        const video =
            e.currentTarget;


        if (!video.duration) return;


        const maxDuration =
            Math.min(
                video.duration,
                120
            );


        const current =
            Math.min(
                video.currentTime,
                maxDuration
            );


        const progress =
            (current / maxDuration) * 100;


        setStatusProgress(progress);


        // IMPORTANT:
        // Video shorter than 2 min
        // will finish naturally.
        //
        // Video longer than 2 min
        // will stop at exactly 120 sec.

        if (
            video.currentTime >= 120
        ) {

            video.pause();


            video.currentTime = 120;


            nextStatus();

        }

    };


    const handleVideoEnded = () => {

        nextStatus();

    };


    // =========================================================
    // DELETE CURRENT FRIEND STATUS
    // =========================================================

    const deleteCurrentStatus = () => {

        if (!friendStatuses.length) return;


        const current =
            friendStatuses[activeStatus];


        if (!current) return;


        // MY STATUS
        if (
            statusOwner?.type === "mine"
        ) {

            deleteMyStatus(
                current.id
            );

            return;

        }


        // FRIEND STATUS
        //
        // Only useful if this account owns
        // that friend's status in localStorage.

        if (
            statusOwner?.type === "friend"
        ) {

            // A viewer cannot delete another user's status.
            closeStatusViewer();
            return;

            const updated = friendStatuses.filter(s => s.id !== current.id);
            setFriendStatuses(updated);


            if (!updated.length) {

                closeStatusViewer();

                return;

            }


            if (
                activeStatus >=
                updated.length
            ) {

                setActiveStatus(
                    updated.length - 1
                );

            }

        }

    };


    // =========================================================
    // SEND FRIEND REQUEST
    // =========================================================

    const sendRequest = async (u) => {
        if (friends.some(friend => friend.id === u.userId) ||
            outgoingRequests.some(request => request.id === u.userId)) {
            alert("Already friends or request already sent.");
            return;
        }
        try {
            await apiRequest("/api/users/requests", {
                method: "POST",
                body: JSON.stringify({ receiverId: u.userId })
            });
            await refreshSocialData();
            alert("Friend request sent.");
        } catch (error) {
            alert(error.message);
        }
    };

    const acceptRequest = async (request) => {
        try {
            await apiRequest("/api/users/requests/" + request.requestId, {
                method: "PUT",
                body: JSON.stringify({ action: "accept" })
            });
            await refreshSocialData();
        } catch (error) {
            alert(error.message);
        }
    };

    const rejectRequest = async (request) => {
        try {
            await apiRequest("/api/users/requests/" + request.requestId, {
                method: "PUT",
                body: JSON.stringify({ action: "reject" })
            });
            await refreshSocialData();
        } catch (error) {
            alert(error.message);
        }
    };

    // =========================================================
    // SEND MESSAGE
    // =========================================================

    const sendMessage = async () => {
        const content = message.trim();
        if (!content || !selected) return;
        try {
            const result = await apiRequest("/api/chat/message", {
                method: "POST",
                body: JSON.stringify({ receiverId: selected.id, content })
            });
            const sent = result.message;
            setMessages(previous => ({
                ...previous,
                [selected.id]: [
                    ...(previous[selected.id] || []),
                    {
                        text: content,
                        time: new Date(sent.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                        }),
                        senderId: sent.senderId
                    }
                ]
            }));
            setMessage("");
        } catch (error) {
            alert(error.message);
        }
    };

    useEffect(() => {
        if (!selected || !selected.id) return;
        let cancelled = false;
        const loadMessages = async () => {
            try {
                const data = await apiRequest("/api/chat/" + selected.id);
                if (!cancelled) {
                    const freshMessages = (data.messages || []).map(item => ({
                        // Old encrypted messages cannot be converted back to plaintext.
                        text: item.content.startsWith("E2EE1:") || item.content.startsWith("E2EE2:")
                            ? "[Old encrypted message — unavailable after encryption was disabled]"
                            : item.content,
                        time: new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                        }),
                        senderId: item.senderId
                    }));

                    setMessages(previous => {
                        const currentMessages = previous[selected.id] || [];
                        if (JSON.stringify(currentMessages) === JSON.stringify(freshMessages)) {
                            return previous;
                        }
                        return { ...previous, [selected.id]: freshMessages };
                    });
                }
            } catch (error) {
                if (!cancelled) console.error("Message refresh failed:", error.message);
            }
        };
        loadMessages();
        const timer = setInterval(loadMessages, 3000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [selected && selected.id]);

    // RENDER    // RENDER
    // =========================================================

    return (

        <div className="snap-chat">


            {/* =================================================
                LEFT PANEL
            ================================================= */}

            <div className="left-panel">


                {/* PROFILE */}

                <div className="profile">


                    <div

                        className={
                            myStatus.length
                                ?
                                "avatar status-ring"
                                :
                                "avatar"
                        }

                        onClick={() => {

                            if (
                                myStatus.length
                            ) {

                                openMyStatus(0);

                            }

                        }}

                    >

                        {

                            profilePhoto

                                ?

                                <img

                                    src={profilePhoto}

                                    alt="Profile"

                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}

                                />

                                :

                                "👤"

                        }

                    </div>


                    <div className="profile-info">

                        <h3>
                            {user.name}
                        </h3>

                        <p>
                            {user.gameId}
                        </p>

                    </div>


                    {/* MY STATUS UPLOAD */}

                    <label className="status-upload">

                        {
                            myStatus.length
                                ?
                                "🟢"
                                :
                                "➕"
                        }

                        <input

                            type="file"

                            multiple

                            accept="image/*,video/*"

                            onChange={uploadStatus}

                        />

                    </label>


                    {/* PROFILE PHOTO */}

                    <label

                        className="status-upload"

                        style={{
                            marginLeft: "5px"
                        }}

                    >

                        📷

                        <input

                            type="file"

                            accept="image/*"

                            onChange={uploadProfile}

                        />

                    </label>


                </div>


                {/* =================================================
                    MY STATUS HORIZONTAL LIST
                ================================================= */}

                {
                    myStatus.length > 0 &&

                    <div className="status-list">

                        {
                            myStatus.map(
                                (status, index) => (

                                    <div

                                        className="status-item"

                                        key={status.id}

                                        onClick={() =>
                                            openMyStatus(index)
                                        }

                                    >

                                        {
                                            status.type &&
                                            status.type.startsWith(
                                                "video"
                                            )

                                                ?

                                                <div
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "24px"
                                                    }}
                                                >
                                                    🎥
                                                </div>

                                                :

                                                <img

                                                    src={
                                                        status.url
                                                    }

                                                    alt="Status"

                                                />

                                        }

                                    </div>

                                )
                            )
                        }

                    </div>

                }


                {/* =================================================
                    SEARCH
                ================================================= */}

                <div className="search-user">

                    <input

                        placeholder="Search users..."

                        value={search}

                        onChange={
                            e =>
                                setSearch(
                                    e.target.value
                                )
                        }

                    />

                </div>


                {/* SEARCH RESULT */}

                {
                    search &&

                    <div className="search-result">

                        {
                            searchLoading ? (
                                <p className="search-message">Searching users...</p>
                            ) : searchError ? (
                                <p className="search-message">{searchError}</p>
                            ) : searchUsers.length === 0 ? (
                                <p className="search-message">No matching users found.</p>
                            ) : searchUsers.filter(u =>
                                !friends.some(friend => friend.id === u.userId) &&
                                !outgoingRequests.some(request => request.id === u.userId)
                            ).map(
                                (u) => (

                                    <div

                                        className="user-card"

                                        key={u.userId}

                                    >

                                        <div>

                                            <h4>
                                                {u.name}
                                            </h4>

                                            <p>
                                                {u.gameId}
                                            </p>

                                        </div>


                                        <button

                                            onClick={() =>
                                                sendRequest(u)
                                            }

                                        >
                                            Add
                                        </button>

                                    </div>

                                )
                            )
                        }

                    </div>

                }


                {/* =================================================
                    FRIEND REQUEST
                ================================================= */}

                <div

                    className="dropdown-title"

                    onClick={() =>
                        setShowRequests(
                            !showRequests
                        )
                    }

                >

                    <h3>
                        Friend Requests
                    </h3>

                    <span>

                        {
                            showRequests
                                ?
                                "▲"
                                :
                                "▼"
                        }

                    </span>

                </div>


                {
                    showRequests &&

                    <div className="request-list">

                        {
                            requests.length === 0

                                ?

                                <p>
                                    No Requests
                                </p>

                                :

                                requests.map(
                                    (r, i) => (

                                        <div

                                            className="user-card"

                                            key={r.requestId}

                                        >

                                            <div>

                                                <h4>
                                                    {r.name}
                                                </h4>

                                                <p>
                                                    {r.gameId}
                                                </p>

                                            </div>


                                            <div>

                                                <button

                                                    onClick={() =>
                                                        acceptRequest(r)
                                                    }

                                                >
                                                    ✔
                                                </button>


                                                <button

                                                    onClick={() =>
                                                        rejectRequest(r)
                                                    }

                                                >
                                                    ✖
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )
                        }

                    </div>

                }


                {/* =================================================
                    FRIEND LIST
                ================================================= */}

                <div

                    className="dropdown-title"

                    onClick={() =>
                        setShowFriends(
                            !showFriends
                        )
                    }

                >

                    <h3>
                        Friends
                    </h3>

                    <span>

                        {
                            showFriends
                                ?
                                "▲"
                                :
                                "▼"
                        }

                    </span>

                </div>


                {
                    showFriends &&

                    <div className="friend-list">

                        {
                            friends.length === 0

                                ?

                                <p>
                                    No Friends
                                </p>

                                :

                                friends.map(
                                    (f, i) => {

                                        const hasStatus =
                                            getFriendStatuses(
                                                f
                                            ).length > 0;


                                        return (

                                            <div

                                                className={
                                                    selected?.id === f.id
                                                        ?
                                                        "friend active"
                                                        :
                                                        "friend"
                                                }

                                                key={i}

                                                onClick={() =>
                                                    setSelected(f)
                                                }

                                            >

                                                <span className="friend-avatar">
                                                    {f.profilePhoto ? <img src={f.profilePhoto} alt="" /> : "👤"}
                                                </span>
                                                <span className="friend-label">{f.name}</span>


                                                {
                                                    hasStatus &&

                                                    <span
                                                        className="small-online"
                                                        style={{
                                                            marginLeft: "8px"
                                                        }}
                                                    >
                                                        🟢
                                                    </span>
                                                }


                                                {
                                                    isOnline(
                                                        f.id
                                                    ) &&

                                                    <span
                                                        className="small-online"
                                                        style={{
                                                            float: "right"
                                                        }}
                                                    >
                                                        🟢
                                                    </span>
                                                }

                                            </div>

                                        );

                                    }
                                )
                        }

                    </div>

                }


                {/* BACK */}

                <button

                    className="back-game"

                    onClick={() =>
                        navigate("/game")
                    }

                >

                    ⬅ Back To Game

                </button>


            </div>


            {/* =====================================================
                RIGHT CHAT
            ===================================================== */}

            <div className="chat-area">


                {
                    selected

                        ?

                        <>


                            {/* CHAT HEADER */}

                            <div className="chat-top">


                                <div className="chat-user">


                                    <div

                                        className="chat-avatar"

                                        style={{
                                            cursor:
                                                getFriendStatuses(
                                                    selected
                                                ).length
                                                    ?
                                                    "pointer"
                                                    :
                                                    "default"
                                        }}

                                        onClick={() =>
                                            openFriendStatus(
                                                selected
                                            )
                                        }

                                    >

                                        {selected.profilePhoto ? (
                                            <img src={selected.profilePhoto} alt={selected.name} className="chat-avatar-image" />
                                        ) : "👤"}

                                    </div>


                                    <div>

                                        <h2>
                                            {selected.name}
                                        </h2>


                                        {
                                            isOnline(
                                                selected.id
                                            ) &&

                                            <p className="online">

                                                🟢 Online

                                            </p>
                                        }

                                    </div>


                                </div>


                                {/* CHAT ACTIONS */}

                                <div className="chat-actions">


                                    <button

                                        className="action-btn"

                                        title="Voice Call"

                                    >
                                        📞
                                    </button>


                                    <button

                                        className="action-btn"

                                        title="Video Call"

                                    >
                                        🎥
                                    </button>

                                    <button className="action-btn" title="Chat settings" aria-label="Chat settings"
                                        onClick={() => setShowChatSettings(value => !value)}>
                                        ⚙️
                                    </button>
                                    {showChatSettings && (
                                        <div className="chat-settings-menu">
                                            <h3>Disappearing messages</h3>
                                            <p>Choose when new messages disappear</p>
                                            <button type="button"
                                                className={chatMode === "after_seen" ? "chat-setting-option active" : "chat-setting-option"}
                                                onClick={() => updateChatMode("after_seen")} disabled={savingChatMode}>
                                                <span>After Seen</span>
                                                <small>Message disappears when the recipient reads it.</small>
                                                {chatMode === "after_seen" && <b>✓</b>}
                                            </button>
                                            <button type="button"
                                                className={chatMode === "12h" ? "chat-setting-option active" : "chat-setting-option"}
                                                onClick={() => updateChatMode("12h")} disabled={savingChatMode}>
                                                <span>After 12 Hours</span>
                                                <small>Message disappears 12 hours after it is sent.</small>
                                                {chatMode === "12h" && <b>✓</b>}
                                            </button>
                                            <small className="chat-retention-note">All messages are permanently deleted from the database within 24 hours.</small>
                                            <button type="button" className="chat-clear-option"
                                                onClick={clearChat} disabled={clearingChat}>
                                                {clearingChat ? "Clearing..." : "Clear Chat"}
                                            </button>
                                        </div>
                                    )}


                                    {/* FRIEND STATUS BUTTON */}

                                    <button

                                        className="action-btn"

                                        title={
                                            getFriendStatuses(
                                                selected
                                            ).length > 0
                                                ?
                                                `${selected.name}'s Status`
                                                :
                                                "No Status"
                                        }

                                        onClick={() =>
                                            openFriendStatus(
                                                selected
                                            )
                                        }

                                    >

                                        🟢

                                    </button>


                                </div>


                            </div>


                            {/* =================================================
                                MESSAGES
                            ================================================= */}

                            <div className="chat-messages">


                                {
                                    (
                                        messages[
                                            selected.id
                                        ] || []
                                    ).length === 0

                                        ?

                                        <div className="empty-chat">

                                            <h2>
                                                👋 Say Hello
                                            </h2>

                                            <p>

                                                Start conversation with

                                                <b>
                                                    {" "}
                                                    {selected.name}
                                                </b>

                                            </p>

                                        </div>

                                        :

                                        (
                                            messages[
                                                selected.id
                                            ] || []
                                        ).map(
                                            (m, i) => (

                                                <div

                                                    className={m.senderId === user.id ? "message sent" : "message received"}

                                                    key={i}

                                                >

                                                    <p>
                                                        {m.text}
                                                    </p>

                                                    <span>
                                                        {m.time}
                                                    </span>

                                                </div>

                                            )
                                        )
                                }

                            </div>


                            {/* INPUT */}

                            <div className="chat-bottom">


                                <input

                                    placeholder="Type message..."

                                    value={message}

                                    onChange={
                                        e =>
                                            setMessage(
                                                e.target.value
                                            )
                                    }

                                    onKeyDown={
                                        e => {

                                            if (
                                                e.key ===
                                                "Enter"
                                            ) {

                                                sendMessage();

                                            }

                                        }
                                    }

                                />


                                <button

                                    className="send-btn"

                                    onClick={
                                        sendMessage
                                    }

                                >

                                    ➤

                                </button>


                            </div>


                        </>


                        :


                        <div className="no-chat">


                            <div className="welcome-icon">
                                💬
                            </div>


                            <h1>
                                Zero Chat
                            </h1>


                            <p>
                                Select a friend to start chatting
                            </p>


                        </div>

                }


            </div>


            {/* =====================================================
                STATUS VIEWER
            ===================================================== */}

            {
                showStatusViewer &&
                friendStatuses.length > 0 &&
                friendStatuses[activeStatus] &&

                <div className="status-viewer">


                    {/* STATUS PROGRESS */}

                    <div className="status-progress">


                        {
                            friendStatuses.map(
                                (status, index) => (

                                    <div

                                        key={status.id}

                                        style={{
                                            flex: 1
                                        }}

                                    >

                                        <div
                                            className="progress-bg"
                                        >

                                            <div

                                                className="progress-bar"

                                                style={{

                                                    width:

                                                        index <
                                                            activeStatus

                                                            ?

                                                            "100%"

                                                            :

                                                            index ===
                                                                activeStatus

                                                                ?

                                                                `${statusProgress}%`

                                                                :

                                                                "0%"

                                                }}

                                            />

                                        </div>

                                    </div>

                                )
                            )
                        }


                    </div>


                    {/* STATUS OWNER */}

                    <div

                        style={{
                            color: "white",
                            fontWeight: "bold",
                            marginBottom: "10px",
                            textAlign: "center"
                        }}

                    >

                        {statusOwner?.name}

                    </div>


                    {/* STATUS MEDIA */}

                    {
                        friendStatuses[
                            activeStatus
                        ].type &&
                        friendStatuses[
                            activeStatus
                        ].type.startsWith(
                            "video"
                        )

                            ?

                            <video

                                ref={videoRef}

                                key={
                                    friendStatuses[
                                        activeStatus
                                    ].id
                                }

                                src={
                                    friendStatuses[
                                        activeStatus
                                    ].url
                                }

                                autoPlay

                                controls

                                playsInline

                                onLoadedMetadata={
                                    handleVideoLoaded
                                }

                                onTimeUpdate={
                                    handleVideoTimeUpdate
                                }

                                onEnded={
                                    handleVideoEnded
                                }

                            />

                            :

                            <img

                                key={
                                    friendStatuses[
                                        activeStatus
                                    ].id
                                }

                                src={
                                    friendStatuses[
                                        activeStatus
                                    ].url
                                }

                                alt="Status"

                            />

                    }


                    <button
                        type="button"
                        className="status-close-btn"
                        onClick={closeStatusViewer}
                        aria-label="Close status"
                        title="Close"
                    >
                        ✕
                    </button>

                    {statusOwner?.type === "mine" && (
                        <button
                            type="button"
                            className="status-delete-btn"
                            onClick={deleteCurrentStatus}
                        >
                            🗑 Delete
                        </button>
                    )}

                    <button
                        type="button"
                        className="status-cancel-btn"
                        onClick={closeStatusViewer}
                    >
                        Close
                    </button>


                </div>

            }


        </div>

    );

}


export default Chat;