import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Chat.css";


function Chat() {

    const navigate = useNavigate();


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

    const [profilePhoto, setProfilePhoto] = useState(() => {

        return (
            localStorage.getItem(
                `profile_photo_${user.gameId}`
            ) ||
            localStorage.getItem("profile_photo") ||
            null
        );

    });


    const uploadProfile = (e) => {

        const file = e.target.files[0];

        if (!file) return;


        const url = URL.createObjectURL(file);


        setProfilePhoto(url);


        localStorage.setItem(
            `profile_photo_${user.gameId}`,
            url
        );


        // old key also keep
        localStorage.setItem(
            "profile_photo",
            url
        );


        e.target.value = "";

    };


    const removeProfile = () => {

        setProfilePhoto(null);

        localStorage.removeItem(
            `profile_photo_${user.gameId}`
        );

        localStorage.removeItem(
            "profile_photo"
        );

    };


    // =========================================================
    // SEARCH
    // =========================================================

    const [search, setSearch] = useState("");


    // =========================================================
    // FRIENDS
    // =========================================================

    const [friends, setFriends] = useState(

        JSON.parse(
            localStorage.getItem("friends")
        ) || []

    );


    const [requests, setRequests] = useState(

        JSON.parse(
            localStorage.getItem("requests")
        ) || []

    );


    const [selected, setSelected] = useState(null);


    // =========================================================
    // MESSAGES
    // =========================================================

    const [message, setMessage] = useState("");


    const [messages, setMessages] = useState(() => {

        try {

            return (
                JSON.parse(
                    localStorage.getItem(
                        "chat_messages"
                    )
                ) || {}
            );

        } catch {

            return {};

        }

    });


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

    const [myStatus, setMyStatus] = useState(() => {

        try {

            const newKey =
                `status_${user.gameId}`;

            const newData =
                localStorage.getItem(newKey);


            if (newData) {

                return JSON.parse(newData);

            }


            // old data migration
            const oldData =
                localStorage.getItem("my_status");


            return oldData
                ? JSON.parse(oldData)
                : [];

        } catch {

            return [];

        }

    });


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
    // USERS
    // =========================================================

    const users = [

        {
            name: "Rahul",
            id: "#123456"
        },

        {
            name: "Aman",
            id: "#654321"
        },

        {
            name: "Priya",
            id: "#987654"
        }

    ];


    const onlineUsers = [

        "#123456",
        "#654321"

    ];


    const isOnline = (id) => {

        return onlineUsers.includes(id);

    };


    // =========================================================
    // STATUS STORAGE HELPER
    // =========================================================

    const getStatusKey = (id) => {

        return `status_${id}`;

    };


    const getFriendStatuses = (friend) => {

        if (!friend) return [];


        try {

            const key =
                getStatusKey(friend.id);


            const data =
                localStorage.getItem(key);


            if (!data) {

                return [];

            }


            const parsed =
                JSON.parse(data);


            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch {

            return [];

        }

    };


    // =========================================================
    // SAVE MY STATUS
    // =========================================================

    const saveMyStatus = (data) => {

        localStorage.setItem(

            getStatusKey(user.gameId),

            JSON.stringify(data)

        );


        // keep old key for compatibility
        localStorage.setItem(

            "my_status",

            JSON.stringify(data)

        );

    };


    // =========================================================
    // UPLOAD MY STATUS
    // =========================================================

    const uploadStatus = (e) => {

        const files =
            Array.from(e.target.files || []);


        if (!files.length) return;


        const newStatuses =
            files.map((file) => ({

                id:
                    `${Date.now()}_${Math.random()}`,

                url:
                    URL.createObjectURL(file),

                type:
                    file.type,

                time:
                    new Date().toISOString()

            }));


        const updated = [

            ...myStatus,

            ...newStatuses

        ];


        setMyStatus(updated);


        saveMyStatus(updated);


        e.target.value = "";

    };


    // =========================================================
    // DELETE MY STATUS
    // =========================================================

    const deleteMyStatus = (id) => {

        const updated =
            myStatus.filter(
                s => s.id !== id
            );


        setMyStatus(updated);


        saveMyStatus(updated);


        if (updated.length === 0) {

            closeStatusViewer();

        }

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


        const statuses =
            getFriendStatuses(friend);


        if (!statuses.length) {

            alert(
                `${friend.name} has no status`
            );

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

            const key =
                getStatusKey(
                    statusOwner.id
                );


            const updated =
                friendStatuses.filter(
                    s => s.id !== current.id
                );


            localStorage.setItem(
                key,
                JSON.stringify(updated)
            );


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

    const sendRequest = (u) => {

        const alreadyFriend =
            friends.find(
                f => f.id === u.id
            );


        if (alreadyFriend) {

            alert("Already Friend");

            return;

        }


        const alreadyRequest =
            requests.find(
                r => r.id === u.id
            );


        if (alreadyRequest) {

            alert(
                "Request Already Sent"
            );

            return;

        }


        const updated = [

            ...requests,

            u

        ];


        setRequests(updated);


        localStorage.setItem(

            "requests",

            JSON.stringify(updated)

        );


        alert(
            "Friend Request Sent"
        );

    };


    // =========================================================
    // ACCEPT REQUEST
    // =========================================================

    const acceptRequest = (req) => {

        const updatedFriends = [

            ...friends,

            req

        ];


        setFriends(updatedFriends);


        localStorage.setItem(

            "friends",

            JSON.stringify(updatedFriends)

        );


        const updatedRequests =
            requests.filter(
                r => r.id !== req.id
            );


        setRequests(updatedRequests);


        localStorage.setItem(

            "requests",

            JSON.stringify(updatedRequests)

        );

    };


    // =========================================================
    // REJECT REQUEST
    // =========================================================

    const rejectRequest = (req) => {

        const updatedRequests =
            requests.filter(
                r => r.id !== req.id
            );


        setRequests(updatedRequests);


        localStorage.setItem(

            "requests",

            JSON.stringify(updatedRequests)

        );

    };


    // =========================================================
    // SEND MESSAGE
    // =========================================================

    const sendMessage = () => {

        if (
            !message.trim() ||
            !selected
        ) {

            return;

        }


        const id =
            selected.id;


        const old =
            messages[id] || [];


        const data = {

            text:
                message.trim(),

            time:
                new Date()
                    .toLocaleTimeString(
                        [],
                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit"
                        }
                    )

        };


        const updatedMessages = {

            ...messages,

            [id]: [

                ...old,

                data

            ]

        };


        setMessages(
            updatedMessages
        );


        localStorage.setItem(

            "chat_messages",

            JSON.stringify(
                updatedMessages
            )

        );


        setMessage("");

    };


    // =========================================================
    // SEARCH RESULT
    // =========================================================

    const searchUsers =
        users.filter(

            u =>

                u.name
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    )

        );


    // =========================================================
    // RENDER
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
                            searchUsers.map(
                                (u, i) => (

                                    <div

                                        className="user-card"

                                        key={i}

                                    >

                                        <div>

                                            <h4>
                                                {u.name}
                                            </h4>

                                            <p>
                                                {u.id}
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

                                            key={i}

                                        >

                                            <div>

                                                <h4>
                                                    {r.name}
                                                </h4>

                                                <p>
                                                    {r.id}
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

                                                👤 {f.name}


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

                                        💬

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

                                                    className="message"

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


                  {/* DELETE */}

<button
    onClick={deleteCurrentStatus}
>
    🗑 Delete
</button>


{/* CANCEL */}

<button
    onClick={closeStatusViewer}
>
    Cancel
</button>


                </div>

            }


        </div>

    );

}


export default Chat;