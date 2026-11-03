const router=require('express').Router();
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const prisma=require('../prisma');
const safeUser=u=>({id:u.id,name:u.name,email:u.email,gameId:u.gameId,role:u.role||'USER',createdAt:u.createdAt});
const makeToken=u=>jwt.sign({id:u.id,email:u.email},process.env.JWT_SECRET,{expiresIn:'7d'});
router.post('/register',async(req,res)=>{
 try{
  const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
  if(name.length<2||!/\S+@\S+\.\S+/.test(email)||password.length<8)return res.status(400).json({message:'Enter a name, valid email and password (minimum 8 characters).'});
  if(await prisma.user.findUnique({where:{email}}))return res.status(409).json({message:'Email already registered.'});
  const passwordHash=await bcrypt.hash(password,12);let gameId;
  do{gameId='#'+Math.floor(100000+Math.random()*900000);}while(await prisma.user.findUnique({where:{gameId}}));
  const user=await prisma.user.create({data:{name,email,passwordHash,gameId,stats:{create:{}}}});
  res.status(201).json({token:makeToken(user),user:safeUser(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Could not create account.'});}
});
router.post('/login',async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||''),user=await prisma.user.findUnique({where:{email}});
  if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({message:'Invalid email or password.'});
  res.json({token:makeToken(user),user:safeUser(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Login failed.'});}
});
router.get('/recovery-status',async(req,res)=>{
 try{const user=await prisma.user.findUnique({where:{id:req.user.id},select:{petAnswerHash:true}});if(!user)return res.status(404).json({message:'User not found.'});res.json({recoveryConfigured:Boolean(user.petAnswerHash)});}
 catch(e){console.error(e);res.status(500).json({message:'Could not check recovery setup.'});}
});
router.put('/recovery-answer',async(req,res)=>{
 try{const petAnswer=String(req.body.petAnswer||'').trim().toLowerCase(),password=String(req.body.password||'');if(petAnswer.length<2||password.length<8)return res.status(400).json({message:'Enter a recovery answer and your current password (minimum 8 characters).'});const user=await prisma.user.findUnique({where:{id:req.user.id}});if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({message:'Current password is incorrect.'});await prisma.user.update({where:{id:req.user.id},data:{petAnswerHash:await bcrypt.hash(petAnswer,12)}});res.json({message:'Password recovery answer saved successfully.'});}
 catch(e){console.error(e);res.status(500).json({message:'Could not save recovery answer.'});}
});
router.get('/pin/status',async(req,res)=>{
 try{const user=await prisma.user.findUnique({where:{id:req.user.id},select:{pinHash:true}});if(!user)return res.status(404).json({message:'User not found.'});res.json({pinConfigured:Boolean(user.pinHash)});}
 catch(e){console.error(e);res.status(500).json({message:'Could not check PIN.'});}
});
router.put('/pin',async(req,res)=>{
 try{const pin=String(req.body.pin||'');if(!/^\d{6}$/.test(pin))return res.status(400).json({message:'PIN must be exactly 6 digits.'});await prisma.user.update({where:{id:req.user.id},data:{pinHash:await bcrypt.hash(pin,12)}});res.json({message:'Private PIN saved successfully.'});}
 catch(e){console.error(e);res.status(500).json({message:'Could not save PIN.'});}
});
router.post('/pin/verify',async(req,res)=>{
 try{const pin=String(req.body.pin||'');if(!/^\d{6}$/.test(pin))return res.status(400).json({message:'Enter your 6 digit PIN.'});const user=await prisma.user.findUnique({where:{id:req.user.id},select:{pinHash:true}});if(!user||!user.pinHash||!await bcrypt.compare(pin,user.pinHash))return res.status(401).json({message:'Wrong PIN or PIN not created yet.'});res.json({ok:true});}
 catch(e){console.error(e);res.status(500).json({message:'PIN verification failed.'});}
});
router.get('/me',async(req,res)=>{
 const user=await prisma.user.findUnique({where:{id:req.user.id}});
 if(!user)return res.status(404).json({message:'User not found.'});
 res.json({user:safeUser(user)});
});
module.exports=router;
