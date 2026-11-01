const router=require('express').Router();
const prisma=require('../prisma');
router.post('/',async(req,res)=>{
 const receiverId=String(req.body.receiverId||''),type=String(req.body.type||'');
 if(!['voice','video'].includes(type))return res.status(400).json({message:'Call type must be voice or video.'});
 if(receiverId===req.user.id)return res.status(400).json({message:'Cannot call yourself.'});
 const receiver=await prisma.user.findUnique({where:{id:receiverId},select:{id:true}});
 if(!receiver)return res.status(404).json({message:'Player not found.'});
 const call=await prisma.callLog.create({data:{callerId:req.user.id,receiverId,type}});
 req.app.get('io').to(receiverId).emit('call:incoming',{callId:call.id,from:req.user.id,type});
 res.status(201).json({call});
});
router.put('/:id/end',async(req,res)=>{
 const call=await prisma.callLog.findFirst({where:{id:req.params.id,OR:[{callerId:req.user.id},{receiverId:req.user.id}]}});
 if(!call)return res.status(404).json({message:'Call not found.'});
 const updated=await prisma.callLog.update({where:{id:call.id},data:{status:String(req.body.status||'completed'),endedAt:new Date()}});
 req.app.get('io').to(call.callerId).emit('call:ended',{callId:call.id});req.app.get('io').to(call.receiverId).emit('call:ended',{callId:call.id});
 res.json({call:updated});
});
module.exports=router;