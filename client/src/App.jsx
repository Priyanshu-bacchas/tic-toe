import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";


import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Chat from "./pages/Chat";



function App(){


return(

<BrowserRouter>

<Routes>


<Route
path="/"
element={<Auth />}
/>


<Route
path="/home"
element={<Home />}
/>


<Route
path="/game"
element={<Game />}
/>


<Route
path="/chat"
element={<Chat />}
/>


</Routes>


</BrowserRouter>


);


}


export default App;