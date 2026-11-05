const router=require('express').Router();
const bcrypt=require('bcrypt'),jwt=require('jsonwebtoken'),prisma=require('../prisma');
const safe=u=>({id:u.id,name:u.name,email:u.email,gameId:u.gameId,role:u.role||'USER',createdAt:u.createdAt});
const token=u=>jwt.sign({id:u.id,email:u.email},process.env.JWT_SECRET,{expiresIn:'7d'});

// Per-process login throttle: max 10 attempts per IP in a rolling 15-minute window.
const loginAttempts=new Map();
function loginRateLimit(req,res,next){
 const now=Date.now(),ip=req.ip||req.socket.remoteAddress||'unknown',windowMs=15*60*1000,limit=10;
 let entry=loginAttempts.get(ip);
 if(!entry||entry.resetAt<=now){entry={count:0,resetAt:now+windowMs};loginAttempts.set(ip,entry);}
 if(entry.count>=limit){
  res.set('Retry-After',String(Math.ceil((entry.resetAt-now)/1000)));
  return res.status(429).json({message:'Too many login attempts. Please try again in 15 minutes.'});
 }
 entry.count++;
 if(loginAttempts.size>5000){for(const [address,item] of loginAttempts){if(item.resetAt<=now)loginAttempts.delete(address);}}
 next();
}

router.post('/register',async(req,res)=>{
 try{
  const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||''),petAnswer=String(req.body.petAnswer||'').trim().toLowerCase();
  if(name.length<2||!/\S+@\S+\.\S+/.test(email)||password.length<8||petAnswer.length<2)return res.status(400).json({message:'Enter a valid name, email, password (minimum 8 characters) and favourite pet answer.'});
  if(await prisma.user.findUnique({where:{email}}))return res.status(409).json({message:'Email already registered.'});
  const passwordHash=await bcrypt.hash(password,12),petAnswerHash=await bcrypt.hash(petAnswer,12);let gameId;
  do{gameId='#'+Math.floor(100000+Math.random()*900000);}while(await prisma.user.findUnique({where:{gameId}}));
  const user=await prisma.user.create({data:{name,email,passwordHash,petAnswerHash,gameId,stats:{create:{}}}});
  res.status(201).json({token:token(user),user:safe(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Could not create account.'});}
});
router.post('/login',loginRateLimit,async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||''),user=await prisma.user.findUnique({where:{email}});
  if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({message:'Invalid email or password.'});
  res.json({token:token(user),user:safe(user)});
 }catch(e){console.error(e);res.status(500).json({message:'Login failed.'});}
});
router.post('/forgot-password',async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase(),petAnswer=String(req.body.petAnswer||'').trim().toLowerCase(),newPassword=String(req.body.newPassword||'');
  if(!email||!petAnswer||newPassword.length<8)return res.status(400).json({message:'Enter your registered email, favourite pet answer and a new password (minimum 8 characters).'});
  const user=await prisma.user.findUnique({where:{email}});
  if(!user||!user.petAnswerHash||!await bcrypt.compare(petAnswer,user.petAnswerHash))return res.status(400).json({message:'Email or favourite pet answer is incorrect. If recovery was not set up, login and set it from your Home page.'});
  await prisma.user.update({where:{id:user.id},data:{passwordHash:await bcrypt.hash(newPassword,12)}});
  res.json({message:'Password updated successfully. Please login with your new password.'});
 }catch(e){console.error(e);res.status(500).json({message:'Password reset failed. Please try again.'});}
});
module.exports=router;
