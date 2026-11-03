const router=require('express').Router();
const prisma=require('../prisma');
async function adminOnly(req,res,next){
 try{const user=await prisma.user.findUnique({where:{id:req.user.id},select:{id:true,role:true}});if(!user||user.role!=='ADMIN')return res.status(403).json({message:'Admin access required.'});next();}
 catch(e){console.error(e);res.status(500).json({message:'Could not verify admin access.'});}
}
router.use(adminOnly);
router.get('/users',async(req,res)=>{
 try{const users=await prisma.user.findMany({orderBy:{createdAt:'desc'},select:{id:true,name:true,email:true,gameId:true,role:true,createdAt:true,_count:{select:{sentMessages:true,receivedMessages:true}}}});res.json({users});}
 catch(e){console.error(e);res.status(500).json({message:'Could not load users.'});}
});
router.patch('/users/:id',async(req,res)=>{
 try{const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase();if(name.length<2||!/\S+@\S+\.\S+/.test(email))return res.status(400).json({message:'Enter a valid name and email.'});const existing=await prisma.user.findUnique({where:{email}});if(existing&&existing.id!==req.params.id)return res.status(409).json({message:'Email is already in use.'});const user=await prisma.user.update({where:{id:req.params.id},data:{name,email},select:{id:true,name:true,email:true,gameId:true,role:true,createdAt:true}});res.json({user});}
 catch(e){if(e.code==='P2025')return res.status(404).json({message:'User not found.'});console.error(e);res.status(500).json({message:'Could not update user.'});}
});
router.delete('/users/:id',async(req,res)=>{
 if(req.params.id===req.user.id)return res.status(400).json({message:'You cannot delete your own admin account.'});
 try{await prisma.user.delete({where:{id:req.params.id}});res.json({message:'User deleted.'});}
 catch(e){if(e.code==='P2025')return res.status(404).json({message:'User not found.'});console.error(e);res.status(500).json({message:'Could not delete user.'});}
});
router.get('/chats',async(req,res)=>{
 try{const messages=await prisma.message.findMany({orderBy:{createdAt:'desc'},take:500,select:{id:true,content:true,createdAt:true,readAt:true,sender:{select:{id:true,name:true,email:true,gameId:true}},receiver:{select:{id:true,name:true,email:true,gameId:true}}}});res.json({messages});}
 catch(e){console.error(e);res.status(500).json({message:'Could not load chat messages.'});}
});
router.delete('/chats/:id',async(req,res)=>{
 try{await prisma.message.delete({where:{id:req.params.id}});res.json({message:'Message deleted.'});}
 catch(e){if(e.code==='P2025')return res.status(404).json({message:'Message not found.'});console.error(e);res.status(500).json({message:'Could not delete message.'});}
});
module.exports=router;
