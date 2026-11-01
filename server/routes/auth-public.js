const router=require('express').Router();
const bcrypt=require('bcrypt'),jwt=require('jsonwebtoken'),prisma=require('../prisma');
const safe=u=>({id:u.id,name:u.name,email:u.email,gameId:u.gameId,createdAt:u.createdAt});
const token=u=>jwt.sign({id:u.id,email:u.email},process.env.JWT_SECRET,{expiresIn:'7d'});
router.post('/register',async(req,res)=>{
 try{
  const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
  if(name.length<2||!/\S+@\S+\.\S+/.test(email)||password.length<8)return res.status(400).json({message:'Enter a valid name, email and password (minimum 8 characters).'});
  if(await prisma.user.findUnique({where:{email}}))return res.status(409).json({message:'Email already registered.'});
  const passwordHash=await bcrypt.hash(password,12);let gameId;
  do{gameId='#'+Math.floor(100000+Math.random()*900000);}while(await prisma.user.findUnique({where:{gameId}}));
  const user=await prisma.user.create({data:{name,email,passwordHash,gameId,stats:{create:{}}}});
  res.status(201).json({token:token(user),user:safe(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Could not create account.'});}
});
router.post('/login',async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||''),user=await prisma.user.findUnique({where:{email}});
  if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({message:'Invalid email or password.'});
  res.json({token:token(user),user:safe(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Login failed.'});}
});
module.exports=router;