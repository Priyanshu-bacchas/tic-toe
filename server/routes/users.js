const router=require('express').Router();
const prisma=require('../prisma');
router.get('/search',async(req,res)=>{
  const q=String(req.query.q||'').trim();
  if(q.length<3) return res.status(400).json({message:'Enter at least 3 characters.'});
  const user=await prisma.user.findFirst({where:{OR:[{gameId:{equals:q.toUpperCase()}},{email:{equals:q.toLowerCase()}}]},select:{id:true,name:true,gameId:true}});
  if(!user) return res.status(404).json({message:'No player found.'});
  if(user.id===req.user.id) return res.status(400).json({message:'You cannot add yourself.'});
  res.json({user});
});
module.exports=router;