import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Game.css";


function Game(){

const navigate = useNavigate();


// 🔊 SOUND

const playSound=(file)=>{

const audio=new Audio(file);

audio.volume=0.5;

audio.play();

};



// USER PROFILE

const user = JSON.parse(
localStorage.getItem("zero_user")
);



const [bonus,setBonus]=useState(

Number(localStorage.getItem("bonus")) || 0

);


const [profileOpen,setProfileOpen]=useState(false);




// 🔍 SEARCH + PRIVATE ROOM


const [searchOpen,setSearchOpen]=useState(false);

const [search,setSearch]=useState("");

const [privateOpen,setPrivateOpen]=useState(false);

const [pinType,setPinType]=useState("");

const [createPin,setCreatePin]=useState("");

const [loginPin,setLoginPin]=useState("");





// 🎮 GAME STATES


const [board,setBoard]=useState(

Array(9).fill("")

);



const [settingOpen,setSettingOpen]=useState(false);

const [scoreOpen,setScoreOpen]=useState(false);

const [levelOpen,setLevelOpen]=useState(false);



const [dark,setDark]=useState(false);



const [level,setLevel]=useState("Medium");



const [winner,setWinner]=useState("");



const [winBoxes,setWinBoxes]=useState([]);




const [score,setScore]=useState(


JSON.parse(localStorage.getItem("score")) ||


{

player:0,

computer:0

}


);





const wins=[


[0,1,2],

[3,4,5],

[6,7,8],

[0,3,6],

[1,4,7],

[2,5,8],

[0,4,8],

[2,4,6]


];




const checkWinner=(data)=>{


for(let w of wins){


let [a,b,c]=w;



if(

data[a] &&

data[a]===data[b] &&

data[a]===data[c]

){


setWinBoxes(w);


return data[a];


}


}





if(!data.includes(""))

return "Draw";




return null;


};




// EMPTY CELLS


const emptyCells=(data)=>{


return data

.map((x,i)=>x===""?i:null)

.filter(x=>x!==null);


};
// EASY AI

const randomMove=(data)=>{


let empty=emptyCells(data);


return empty[

Math.floor(Math.random()*empty.length)

];


};







// HARD AI (MINIMAX)


const findBestMove=(data)=>{


let bestScore=-Infinity;

let move;



for(let i of emptyCells(data)){


data[i]="O";


let score=minimax(data,0,false);


data[i]="";



if(score>bestScore){


bestScore=score;


move=i;


}


}



return move;


};







const minimax=(data,depth,isMax)=>{


let result=checkWinner(data);




if(result==="O")

return 10-depth;




if(result==="X")

return depth-10;




if(result==="Draw")

return 0;







if(isMax){


let best=-Infinity;



for(let i of emptyCells(data)){


data[i]="O";



best=Math.max(


best,


minimax(data,depth+1,false)


);



data[i]="";



}


return best;


}





else{


let best=Infinity;



for(let i of emptyCells(data)){


data[i]="X";



best=Math.min(


best,


minimax(data,depth+1,true)


);



data[i]="";



}



return best;


}


};









// MEDIUM AI


const mediumMove=(data)=>{



// ATTACK


for(let i of emptyCells(data)){


data[i]="O";



if(checkWinner(data)==="O"){


data[i]="";


return i;


}


data[i]="";


}






// BLOCK PLAYER



for(let i of emptyCells(data)){


data[i]="X";



if(checkWinner(data)==="X"){


data[i]="";


return i;


}


data[i]="";


}





return randomMove(data);


};








// COMPUTER MOVE


const computerMove=(data)=>{


setTimeout(()=>{


let move;



if(level==="Easy")


move=randomMove(data);



else if(level==="Medium")


move=mediumMove(data);



else


move=findBestMove(data);






data[move]="O";



setBoard([...data]);




let result=checkWinner(data);



if(result)


gameOver(result);




},700);



};

// GAME OVER

const gameOver=(result)=>{


setWinner(result);




if(result==="X")

playSound("/sounds/win.mp3");



if(result==="O")

playSound("/sounds/lose.mp3");



if(result==="Draw")

playSound("/sounds/draw.mp3");






let s={...score};





if(result==="X"){


s.player++;



// 🎁 BONUS POINT +100

let newBonus = bonus + 100;


setBonus(newBonus);



localStorage.setItem(

"bonus",

newBonus

);



}





if(result==="O"){


s.computer++;


}





setScore(s);



localStorage.setItem(

"score",

JSON.stringify(s)

);



};











// CLICK CELL


const clickCell=(index)=>{


if(board[index] || winner)

return;




let temp=[...board];


temp[index]="X";




playSound("/sounds/click.mp3");



setBoard(temp);





let result=checkWinner(temp);



if(result){


gameOver(result);


return;


}




computerMove(temp);



};








// RESET


const reset=()=>{


setBoard(Array(9).fill(""));


setWinner("");


setWinBoxes([]);



};









// CLEAR SCORE


const clearScore=()=>{


let s={


player:0,


computer:0


};





setScore(s);



localStorage.setItem(


"score",


JSON.stringify(s)


);



};










// CREATE PIN


const savePin=()=>{


if(createPin.length!==6)

{


alert("6 digit PIN required");


return;


}





localStorage.setItem(


"privatePin",


createPin


);





alert("PIN Created Successfully");



setCreatePin("");



};








// LOGIN PIN


const loginPrivate=()=>{


let savedPin=


localStorage.getItem("privatePin");




if(loginPin===savedPin && savedPin)

{


navigate("/chat");


}

else{


alert("Wrong PIN");


}



};







return(


<div className={dark?"game-page dark":"game-page"}>


< div className="game-container">

<div className="header">



<button

className="search-btn"

onClick={()=>{


setSearchOpen(!searchOpen);


setSearch("");


setPrivateOpen(false);


setPinType("");

}}

>

🔍

</button>





<h1>

🎮 Tic Tac Toe

</h1>





<button

className="setting-btn"

onClick={()=>setSettingOpen(!settingOpen)}

>

⚙️

</button>







{

searchOpen &&



<div className="search-box">



<input


placeholder="Search..."


value={search}


onChange={(e)=>{


let value=e.target.value;


setSearch(value);



if(value.toLowerCase()==="private")

{


setPrivateOpen(true);


}

else

{


setPrivateOpen(false);


setPinType("");


}



}}


/>





{

privateOpen &&



<div className="private-card">



<button

onClick={()=>setPinType("create")}

>

🔑 Create PIN

</button>





<button

onClick={()=>setPinType("login")}

>

🔐 Enter PIN

</button>






{

pinType==="create" &&



<div>


<input


type="number"


maxLength="6"


placeholder="6 Digit PIN"


value={createPin}


onChange={(e)=>setCreatePin(e.target.value)}


/>



<button

onClick={savePin}

>

Save PIN

</button>


</div>


}







{

pinType==="login" &&



<div>


<input


type="number"


maxLength="6"


placeholder="Enter PIN"


value={loginPin}


onChange={(e)=>setLoginPin(e.target.value)}


/>



<button

onClick={loginPrivate}

>

Login

</button>


</div>


}




</div>



}



</div>



}



</div>








<div className="players-score">


<div className="player-card">


<h4>

🤖 Player

</h4>


<span>

{score.computer}

</span>



</div>







<div className="player-card">


<h4>

👤 You

</h4>


<span>

{score.player}

</span>



</div>



</div>







{


settingOpen &&



<div className="settings-panel">



<h3>

⚙️ Settings

</h3>






{/* PROFILE */}

<button

className="option-btn"

onClick={()=>setProfileOpen(!profileOpen)}

>

👤 Profile

</button>






{


profileOpen &&



<div className="score-box">


<p>

Name : {user?.name || "Player"}

</p>



<p>

Game ID : {user?.gameId || "------"}

</p>



<p>

Bonus Point : {bonus}

</p>



</div>


}






<button

className="option-btn"

onClick={()=>setScoreOpen(!scoreOpen)}

>

📊 Score

</button>





{

scoreOpen &&



<div className="score-box">


<p>

Computer : {score.computer}

</p>



<p>

You : {score.player}

</p>




<button

className="clear-btn"

onClick={clearScore}

>

Clear Score

</button>



</div>


}

<button

className="option-btn"

onClick={()=>setDark(!dark)}

>

🌙 Theme

</button>







<button

className="option-btn"

onClick={()=>setLevelOpen(!levelOpen)}

>

🎯 Level : {level}

</button>






{

levelOpen &&



<div className="level-menu">


<button

onClick={()=>setLevel("Easy")}

>

Easy

</button>



<button

onClick={()=>setLevel("Medium")}

>

Medium

</button>



<button

onClick={()=>setLevel("Hard")}

>

Hard

</button>



</div>


}




</div>



}








<div className="board">



{


board.map((cell,index)=>(



<button


key={index}



className={

winBoxes.includes(index)

?

"winner-box"

:

""

}



onClick={()=>clickCell(index)}



>


{cell}



</button>



))


}




</div>








<div className="bottom-buttons">



<button

className="reset"


onClick={reset}

>


🔄 Reset


</button>







<button

className="home"


onClick={()=>navigate("/home")}


>


🏠 Home


</button>






</div>









{

winner &&



<div className="winner-popup">



<div className="winner-card">





<h2>



{


winner==="X"


?


"🎉 You Win!"


:


winner==="O"


?


"😢 You Lose!"


:


"🤝 Draw"



}



</h2>







<button

onClick={reset}

>


Play Again


</button>





</div>



</div>



}








</div>


</div>


)


}



export default Game;