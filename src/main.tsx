import React,{useEffect,useState} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Parade from './Parade';
import PoseSheet from './PoseSheet';
import './styles.css';
/** The studio, the Parade wall at #parade (#parade?ui=off: no controls, for the wall itself), or its pose sheet at #poses. */
function Root(){
 const [hash,setHash]=useState(()=>location.hash);
 useEffect(()=>{const on=()=>setHash(location.hash);addEventListener('hashchange',on);return()=>removeEventListener('hashchange',on);},[]);
 return hash.split('?')[0]==='#parade'?<Parade/>:hash==='#poses'?<PoseSheet/>:<App/>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);
