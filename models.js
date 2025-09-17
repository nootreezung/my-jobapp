const paginate = require('mongoose-paginate-v2')
const mongoose = require('mongoose')

const connect = mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, useUnifiedTopology: true
})

 // ตรวจสอบว่ามีการเชื่อมต่อไปยังฐานข้อมูลแล้วหรือไม่
connect.then(() => {
  console.log('Database connected successfully')
})
.catch(() => {
  console.log('Database cannot be connected')
})

const dataApplication = new mongoose.Schema({
  companyname: { type: String, required: true },
  location: { type: String, required: true, default: 'กรุงเทพมหานคร', trim: true },
  websitecompany: { type: String, lowercase: true, default: 'https://www.google.com/', trim: true },
  title: { type: String, default: 'นักพัฒนาเว็บ (Web Developer)', trim: true, required: true },
  description: { type: String, default: 'พัฒนาและดูแลเว็บไซต์ของลูกค้า รวมถึงระบบ fontend/backend', trim: true, required: true },
  salary: { type: String, default: '40000 - 60000', trim: true, required: true },
  telephonenumber: { type: String, required: true, default: '0812345678', minlength: 10, maxlength: 40 },
  date_added: { type: Date, default: new Date() },
})

dataApplication.plugin(paginate)

 // สร้าง Schema โครงสร้างของตารางฐานข้อมูลผู้ใช้
const loginSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, requied: true },
})

// สร้างโมเดลเพื่อเอาไว้ใช้จัดการข้อมูล Users
const Jobapp = new mongoose.model('Jobapp', dataApplication)
const collection = new mongoose.model('User', loginSchema)

module.exports.Jobapp = Jobapp
module.exports.collection = collection