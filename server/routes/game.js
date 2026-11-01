const router=require('express').Router();
const prisma=require('../prisma');
router.get('/stats',async(req,res)=>{
  const stats=await prisma.gameStats.upsert({where:{userId:req.user.id},create:{userId:req.user.id},update:{}});
  res.json({stats});
});
router.put('/stats',async(req,res)=>{
  const {wins,losses,draws}=req.body;
  if(![wins,losses,draws].every(n=>Number.isInteger(n)&&n>=0)) return res.status(400).json({message:'Wins, losses and draws must be non-negative integers.'});
  const stats=await prisma.gameStats.upsert({where:{userId:req.user.id},create:{userId:req.user.id,wins,losses,draws},update:{wins,losses,draws}});
  res.json({stats});
});
module.exports=router;