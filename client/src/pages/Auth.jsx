import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Auth.css";


function Auth(){

const navigate = useNavigate();


const [mode,setMode]=useState("login");


// Login

const [loginName,setLoginName]=useState("");
const [loginPassword,setLoginPassword]=useState("");


// Signup

const [name,setName]=useState("");
const [signupPassword,setSignupPassword]=useState("");
const [confirmPassword,setConfirmPassword]=useState("");
const [pet,setPet]=useState("");


// Forgot

const [forgotName,setForgotName]=useState("");
const [forgotPet,setForgotPet]=useState("");
const [newPassword,setNewPassword]=useState("");



// Show Hide

const [showLogin,setShowLogin]=useState(false);
const [showSignup,setShowSignup]=useState(false);
const [showConfirm,setShowConfirm]=useState(false);
const [showNew,setShowNew]=useState(false);



// Create ID

const createGameId=()=>{

return "#"+Math.floor(
100000+Math.random()*900000
);

};




// SIGNUP

const signup=()=>{


if(
!name ||
!signupPassword ||
!confirmPassword ||
!pet
){

alert("Please fill all fields");
return;

}


if(signupPassword!==confirmPassword){

alert("Password not match");
return;

}



const oldUser =
JSON.parse(localStorage.getItem("zero_user"));


if(oldUser){

alert("Account already exists");
return;

}



const user={

name:name,

password:signupPassword,

pet:pet,

gameId:createGameId()

};



localStorage.setItem(
"zero_user",
JSON.stringify(user)
);



alert(
`Account Created Successfully

Name : ${user.name}

ID : ${user.gameId}`
);



setMode("login");


};






// LOGIN

const login=()=>{


const user =
JSON.parse(localStorage.getItem("zero_user"));



if(!user){

alert("Create account first");
return;

}



if(

loginName===user.name &&

loginPassword===user.password

){


localStorage.setItem(
"logged",
"true"
);


navigate("/home");


}
else{

alert("Wrong Username or Password");

}


};






// FORGOT

const forgot=()=>{


const user =
JSON.parse(localStorage.getItem("zero_user"));



if(!user){

alert("Account not found");
return;

}



if(

forgotName===user.name &&

forgotPet.toLowerCase()
===
user.pet.toLowerCase()

){


user.password=newPassword;


localStorage.setItem(
"zero_user",
JSON.stringify(user)
);



alert("Password Changed");


setMode("login");


}

else{

alert("Wrong Details");

}


};






return(

<div className="auth-page">


<div className="auth-card">


<div className="logo">

<h1>
ZERO
</h1>

<h2>
CROSS
</h2>

</div>





<div className="tabs">


<button

className={mode==="login"?"active":""}

onClick={()=>setMode("login")}

>

Login

</button>



<button

className={mode==="signup"?"active":""}

onClick={()=>setMode("signup")}

>

Sign Up

</button>


</div>







{
mode==="login" &&

<div className="form">


<input

placeholder="Username"

value={loginName}

onChange={(e)=>setLoginName(e.target.value)}

/>





<div className="password-box">


<input

placeholder=""

type={
showLogin
?
"text"
:
"password"
}

value={loginPassword}

onChange={(e)=>setLoginPassword(e.target.value)}

/>


<label>
Password
</label>



<span

onClick={()=>setShowLogin(!showLogin)}

>

{
showLogin
?
<FaEye/>
:
<FaEyeSlash/>
}

</span>


</div>





<button

className="main-btn"

onClick={login}

>

LOGIN

</button>




<p

className="link"

onClick={()=>setMode("forgot")}

>

Forgot Password?

</p>


</div>


}







{
mode==="signup" &&


<div className="form">


<input

placeholder="Your Name"

value={name}

onChange={(e)=>setName(e.target.value)}

/>





<div className="password-box">


<input

placeholder=""

type={showSignup?"text":"password"}

value={signupPassword}

onChange={(e)=>setSignupPassword(e.target.value)}

/>


<label>
Create Password
</label>



<span

onClick={()=>setShowSignup(!showSignup)}

>

{
showSignup
?
<FaEye/>
:
<FaEyeSlash/>
}

</span>


</div>






<div className="password-box">


<input

placeholder=""

type={showConfirm?"text":"password"}

value={confirmPassword}

onChange={(e)=>setConfirmPassword(e.target.value)}

/>


<label>
Confirm Password
</label>



<span

onClick={()=>setShowConfirm(!showConfirm)}

>

{
showConfirm
?
<FaEye/>
:
<FaEyeSlash/>
}

</span>


</div>






<input

placeholder="Favorite Pet Name"

value={pet}

onChange={(e)=>setPet(e.target.value)}

/>




<button

className="main-btn"

onClick={signup}

>

CREATE ACCOUNT

</button>


</div>


}








{
mode==="forgot" &&


<div className="form">


<input

placeholder="Username"

value={forgotName}

onChange={(e)=>setForgotName(e.target.value)}

/>




<input

placeholder="Favorite Pet Name"

value={forgotPet}

onChange={(e)=>setForgotPet(e.target.value)}

/>





<div className="password-box">


<input

placeholder=""

type={showNew?"text":"password"}

value={newPassword}

onChange={(e)=>setNewPassword(e.target.value)}

/>


<label>
New Password
</label>



<span

onClick={()=>setShowNew(!showNew)}

>

{
showNew
?
<FaEye/>
:
<FaEyeSlash/>
}

</span>


</div>






<button

className="main-btn"

onClick={forgot}

>

CHANGE PASSWORD

</button>




<p

className="link"

onClick={()=>setMode("login")}

>

Back To Login

</p>



</div>


}



</div>

</div>


);


}


export default Auth;