import { useNavigate } from "react-router-dom";
import "./Home.css";


function Home(){


const navigate = useNavigate();


const user = JSON.parse(
localStorage.getItem("zero_user")
);



const logout = ()=>{

localStorage.removeItem("logged");

navigate("/");

};



return(


<div className="home-page">


<div className="home-card">



<div className="logo">

<h1>
ZERO
</h1>


<h2>
CROSS
</h2>


</div>




<div className="welcome-box">


<h3>
Welcome
</h3>


<h2>
{user?.name || "Player"}
</h2>


<p>
Your Game ID
</p>



<div className="game-id">

{user?.gameId || "------"}

</div>



</div>




<button

className="main-btn"

onClick={()=>navigate("/game")}

>

🎮 START GAME

</button>




<button

className="logout-btn"

onClick={logout}

>

🚪 LOGOUT

</button>




</div>


</div>


);


}


export default Home;