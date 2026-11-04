const router=require('express').Router();
const prisma=require('../prisma');

async function adminOnly(req,res,next){
  try {
    const user=await prisma.user.findUnique({where:{id:req.user.id},select:{id:true,role:true}});
    if(!user||user.role!=='ADMIN') return res.status(403).json({message:'Admin access required.'});
    next();
  } catch(e) {
    console.error(e);
    res.status(500).json({message:'Could not verify admin access.'});
  }
}
router.use(adminOnly);

router.get('/dashboard',async(req,res)=>{
  try {
    const [users,messages,calls,pendingRequests,recentUsers,recentMessages]=await Promise.all([
      prisma.user.count(),prisma.message.count(),prisma.callLog.count(),
      prisma.friendRequest.count({where:{status:'PENDING'}}),
      prisma.user.findMany({orderBy:{createdAt:'desc'},take:5,select:{id:true,name:true,email:true,gameId:true,role:true,createdAt:true}}),
      prisma.message.findMany({orderBy:{createdAt:'desc'},take:5,select:{id:true,content:true,createdAt:true,sender:{select:{name:true,email:true}},receiver:{select:{name:true,email:true}}}})
    ]);
    res.json({stats:{users,messages,calls,pendingRequests},recentUsers,recentMessages});
  } catch(e) { console.error(e);res.status(500).json({message:'Could not load dashboard.'}); }
});

router.get('/users',async(req,res)=>{
  try {
    const users=await prisma.user.findMany({orderBy:{createdAt:'desc'},select:{
      id:true,name:true,email:true,gameId:true,role:true,createdAt:true,updatedAt:true,profilePhoto:true,
      stats:{select:{wins:true,losses:true,draws:true}},
      _count:{select:{sentMessages:true,receivedMessages:true,outgoingCalls:true,incomingCalls:true,sentFriendRequests:true,receivedFriendRequests:true,statuses:true}}
    }});
    res.json({users});
  } catch(e) { console.error(e);res.status(500).json({message:'Could not load users.'}); }
});

router.get('/users/:id',async(req,res)=>{
  try {
    const user=await prisma.user.findUnique({where:{id:req.params.id},select:{
      id:true,name:true,email:true,gameId:true,role:true,createdAt:true,updatedAt:true,profilePhoto:true,
      stats:{select:{wins:true,losses:true,draws:true,updatedAt:true}},
      sentMessages:{orderBy:{createdAt:'desc'},take:250,select:{id:true,content:true,createdAt:true,readAt:true,receiver:{select:{id:true,name:true,email:true,gameId:true}}}},
      receivedMessages:{orderBy:{createdAt:'desc'},take:250,select:{id:true,content:true,createdAt:true,readAt:true,sender:{select:{id:true,name:true,email:true,gameId:true}}}},
      outgoingCalls:{orderBy:{startedAt:'desc'},take:50,select:{id:true,type:true,status:true,startedAt:true,endedAt:true,receiver:{select:{name:true,email:true}}}},
      incomingCalls:{orderBy:{startedAt:'desc'},take:50,select:{id:true,type:true,status:true,startedAt:true,endedAt:true,caller:{select:{name:true,email:true}}}},
      sentFriendRequests:{orderBy:{createdAt:'desc'},take:100,select:{id:true,status:true,createdAt:true,receiver:{select:{name:true,email:true,gameId:true}}}},
      receivedFriendRequests:{orderBy:{createdAt:'desc'},take:100,select:{id:true,status:true,createdAt:true,sender:{select:{name:true,email:true,gameId:true}}}},
      statuses:{orderBy:{createdAt:'desc'},take:50,select:{id:true,type:true,createdAt:true,expiresAt:true,mediaUrl:true}}
    }});
    if(!user)return res.status(404).json({message:'User not found.'});
    const chats=[
      ...user.sentMessages.map(m=>({...m,direction:'Sent',peer:m.receiver})),
      ...user.receivedMessages.map(m=>({...m,direction:'Received',peer:m.sender}))
    ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    res.json({user:{...user,sentMessages:undefined,receivedMessages:undefined},chats});
  } catch(e) { console.error(e);res.status(500).json({message:'Could not load user details.'}); }
});

router.patch('/users/:id',async(req,res)=>{
  try {
    const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase();
    if(name.length<2||!/\\S+@\\S+\\.\\S+/.test(email))return res.status(400).json({message:'Enter a valid name and email.'});
    const existing=await prisma.user.findUnique({where:{email}});
    if(existing&&existing.id!==req.params.id)return res.status(409).json({message:'Email is already in use.'});
    const user=await prisma.user.update({where:{id:req.params.id},data:{name,email},select:{id:true,name:true,email:true,gameId:true,role:true,createdAt:true}});
    res.json({user});
  } catch(e) { if(e.code==='P2025')return res.status(404).json({message:'User not found.'});console.error(e);res.status(500).json({message:'Could not update user.'}); }
});

router.delete('/users/:id',async(req,res)=>{
  if(req.params.id===req.user.id)return res.status(400).json({message:'You cannot delete your own admin account.'});
  try {
    const target=await prisma.user.findUnique({where:{id:req.params.id},select:{id:true}});
    if(!target)return res.status(404).json({message:'User not found.'});
    await prisma.chatPreference.deleteMany({where:{conversationKey:{contains:target.id}}});
    await prisma.user.delete({where:{id:target.id}});
    res.json({message:'User and related records deleted.'});
  } catch(e) { console.error(e);res.status(500).json({message:'Could not delete user and related data.'}); }
});

router.get('/chats',async(req,res)=>{
  try {
    const messages=await prisma.message.findMany({orderBy:{createdAt:'desc'},take:500,select:{id:true,content:true,createdAt:true,readAt:true,sender:{select:{id:true,name:true,email:true,gameId:true}},receiver:{select:{id:true,name:true,email:true,gameId:true}}}});
    res.json({messages});
  } catch(e) { console.error(e);res.status(500).json({message:'Could not load chat messages.'}); }
});
router.delete('/chats/:id',async(req,res)=>{
  try { await prisma.message.delete({where:{id:req.params.id}});res.json({message:'Message deleted.'}); }
  catch(e) { if(e.code==='P2025')return res.status(404).json({message:'Message not found.'});console.error(e);res.status(500).json({message:'Could not delete message.'}); }
});
module.exports=router;
