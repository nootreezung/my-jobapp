require('dotenv').config()
const port = process.env.PORT
const models = require('./models')
const connect = models.connect
connect()
const collection = models.collection
const Jobapp = models.Jobapp
const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const formidable = require('formidable')
const fileSystem = require('fs')

const app = express()
app.use(express.json())

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (request, response) => {
    response.render('login')
})

app.all('/signup', async (request, response) => {
    if (request.method == 'GET') {
        response.render('signup')
    } else if (request.method == 'POST') {
        const data = {
            name: request.body.username,
            password: request.body.password,
        }

        // ตรวจสอบผู้ใช้ว่ามีอยู่ในฐานข้อมูลแล้วหรือไม่
        const existingUser = await collection.findOne({ name: data.name })
        console.log('data.name => ' + data.name)
        console.log('existingUser => ' + existingUser)

        if (existingUser) {
            response.status(409)
            response.type('text/html')
            response.send('<center><h3>User already exists. Please choose a different username.</h3></center>')
        } else {
            // เข้ารหัสข้อมูลโดยการใช้เมธอด bcrypt
            const saltRounds = 10 // กำหนดรอบในการประมวลผล salt rounds ยิ่งมากยิ่ง hash ปลอดภัยขึ้น
            // ทำการแปลงพาสเวิร์ดให้อยู่ในรูปของค่า Hash เพื่อให้ยากในการถอดรหัสของพาสเวิร์ด
            console.log('data.password => ' + data.password)
            const hashedPassword = await bcrypt.hash(data.password, saltRounds)
            console.log('hashedPassword => ' + hashedPassword)

            // แทนที่พาสเวิร์ดที่ถูกเข้ารหัสแล้วกับพาสเวิร์ดเดิมก่อนที่จะถูกเข้ารหัส
            data.password = hashedPassword

            const userData = await collection.insertMany(data)
            console.log('userData => ' + userData)
            response.render('login')
        }
    } else {
        response.render('signup')
    }
})

app.post('/login', async (request, response) => {
    try {
        const checkRegister = await collection.findOne({ name: request.body.username })
        if (!checkRegister) {
            response.status(404)
            response.type('text/html')
            response.send('<center><h3>User name cannot found</center>')
        }

        // ทำการเปรียบเทียบพาสเวิร์ดที่ถูกเข้ารหัสจากฐานข้อมูลกับข้อความในรูปแบบ plain ว่าเหมือนกันไหม
        const isPasswordMatch = await bcrypt.compare(request.body.password, checkRegister.password)
        if (isPasswordMatch) {
            response.render('index')
        } else {
            response.status(401)
            response.type('text/html')
            response.send('<center><h3>Wrong password</h3></center>')
        }
    } catch {
        response.status(404)
        response.type('text/html')
        response.send('<center><h3>Wrong Details</center>')
    }
})

app.get('/index', (request, response) => {
    response.render('index')
})

app.get('/logout', (request, response) => {
    response.render('login')
})

app.all('/adds-data-job', (request, response) => {
    if (!request.body) {
        response.render('adds-data-job')
    } else {
        let postData = request.body
        data = {
            companyname: postData.companyname || '',
            location: postData.location || '',
            websitecompany: postData.websitecompany || '',
            title: postData.title || '',
            description: postData.description || '',
            salary: postData.salary || '',
            telephonenumber: postData.telephonenumber || '',
            date_added: new Date(Date.parse(postData.date_added)) || new Date(), 
        }
        Jobapp
        .create(data)
        .then(doc => {
            let senres = (doc) ? true : false
            if (doc) {
                response.render('adds-data-job', { sendresult: senres })
            }
        })
    }
})

app.get('/shows-data-job', (request, response) => {
    Jobapp
    .find({})
    .then(docs => {
        if (docs) {
            console.log('Docs were send - Show all docs')
            response.render('shows-data-job', { data: docs })
        }
    })
    .catch(err => console.log(err))
})

app.get('/edits-and-deletes-data-job', (request, response) => {
    Jobapp
    .find({})
    .then(docs => {
        if (docs) {
            console.log('Docs were read')
            response.render('edits-and-deletes-data-job', { data: docs })
        }
    })
    .catch(err => console.log(err))
})

app.all('/edits-job/:id', (request, response) => {
    if (request.method == 'GET') {
        if (request.params.id) { // เช็คว่ามีค่า id ส่งมาจาก url ไหม
            let id = request.params.id
            Jobapp
            .findById(id)
            .then(doc => {
                if (doc) {
                    response.render('edits-job', { data: doc })
                }
            })
            .catch(err => console.log(err))
        } else {
            response.render('edits-and-deletes-data-job')
        }
    } else if (request.method == 'POST') {
        let formData = request.body
        let data = {
            companyname: formData.companyname || '',
            location: formData.location || '',
            websitecompany: formData.websitecompany || '',
            title: formData.title || '',
            description: formData.description || '',
            salary: formData.salary || 0,
            telephonenumber: formData.telephonenumber || '',
            date_added: new Date(Date.parse(formData.date_added)) || new Date(),
        }
        Jobapp
        .findByIdAndUpdate(request.params.id, data, { useFindAndModify: false })
        .then(doc => {
            if (doc) {
                console.log('Doc was updated!')
                response.redirect('/edits-and-deletes-data-job')
            }
        })
        .catch(err => console.log(err))
    }
})

app.get('/deletes-job/:id', (request, response) => {
    if (request.params.id) {
        Jobapp
        .findByIdAndDelete(request.params.id, { useFindAndModify: false })
        .then(doc => {
            if (doc) {
                console.log('Doc was deleted!')
                response.redirect('/edits-and-deletes-data-job')
            }
        })
        .catch(err => console.log(err))
    }
})

app.get('/searchs-data-job', (request, response) => {
    let searchj = request.query.searchjob || ''
    Jobapp
    .find({ title: { $regex: searchj, $options: 'i' }})
    .then(docs => {
        if (docs) {
            response.render('searchs-data-job', { data: docs, searchj: searchj })
            console.log('Search jobs were completed!')
        }
    })
    .catch(err => console.log(err))
})

app.get('/shows-paging-pn-data-job', (request, response) => {
    let options = {
        page: request.query.page || 1,
        limit: 5,
    }
    Jobapp
    .paginate({}, options, (err, result) => {
        let links = []
        if (result.page > 1) {
            links.push(`<a href="${request.path}?page=1">หน้าแรก</a>`)
        }
        if (result.hasPrevPage) {
            links.push(`<a href="${request.path}?page=${result.prevPage}">หน้าที่แล้ว</a>`)
        }
        if (result.hasNextPage) {
            links.push(`<a href="${request.path}?page=${result.nextPage}">หน้าถัดไป</a>`)
        }
        if (result.page < result.totalPages) {
            links.push(`<a href="${request.path}?page=${result.totalPages}">หน้าสุดท้าย</a>`)
        }

        let pageLink = links.join(' - ')
        response.render('shows-paging-pn-data-job', {
            data: result.docs, page: result.page, pageLink: pageLink
        })
    })
})

app.get('/shows-paging-no-data-job', (request, response) => {
    let options = {
        page: request.query.page || 1,
        limit: 5,
    }
    Jobapp
    .paginate({}, options, (err, result) => {
        let links = []
        for (i = 1; i <= result.totalPages; i++) {
            if (i == result.page) {
                links.push(i) // เพจปัจจุบันไม่ทำลิงก์
            } else {
                links.push(`<a href="${request.path}?page=${i}">${i}</a>`)
            }
        }
        let pageLink = links.join(' - ')
        response.render('shows-paging-no-data-job', {
            data: result.docs, pageLink: pageLink
        })
    })
})

app.all('/upload', (request, response) => {
    if (request.method == 'GET') {
        response.render('upload')
        return
    } else {
        let form = new formidable.IncomingForm()
        form.parse(request, (err, fields, files) => {
            if (err) {
                console.log('Error:', err)
                response.end()
                return
            }

            if (files.upfile.originalFilename == '') {
                response.render('upload')
                return
            }

            let upfile = files.upfile
            let dir = 'public/upload/'
            let newfile = dir + upfile.originalFilename
            let newName = upfile.originalFilename // ชื่อไฟล์ปัจจุบันที่มีการอัปโหลดเข้ามาที่เซิร์ฟเวอร์

            // ถ้าไม่ต้องการให้เขียนทับไฟล์เดิม และให้ไฟล์มีชื่อซ้ำกัน
            if (!fields.overwrite && fileSystem.existsSync(newfile) && upfile && upfile.orginalFilename) {
                let oldName = files.upfile.originalFilename.split('.') // แยกชื่อไฟล์ด้วย . กรณีซ้ำกัน
                let randomNumber = Math.floor(Math.random() * 999999) // สร้างเลขสุ่มสำหรับต่อชื่อไฟล์ซ้ำที่เจอ
                oldName[0] += '_' + randomNumber // เชื่อมต่อชื่อไฟล์เดิมด้วย Underscore และค่าเลขสุ่มที่ได้มาใหม่
                newName = oldName.join('.') // รวมชื่อไฟล์ใหม่เข้ากับส่วนขยายของไฟล์เก่าที่แยกออกมาก่อนหน้านี้
                newfile = dir + newName // ไฟล์ใหม่พร้อมพาธที่จะนำไปใส่ในเมธอด renameSync() สำหรับคัดลอกไฟล์ไปเก็บไว้ในโฟลเดอร์ของ Server
            }
            // ทำการคัดลอกไฟล์ไปเก็บไว้ที่โฟลเดอร์ของเซิร์ฟเวอร์
            console.log('upfile.originalFilename => ' + files.upfile.originalFilename)
            try {
                fileSystem.renameSync(files.upfile.originalFilename, newfile, err => { })
            } catch (err) {
                console.log('renameSync Error: ', err)
            }
            
            // สร้างตัวแปรสำหรับรับค่าเพื่อส่งไปแสดงผลที่เท็มเพลตของเรา
            let data = {}
            
            // ทำการเช็คว่าประเภทไฟล์เป็นรูปภาพไหม ถ้าใช่ให้ส่งไปแสดงผลที่เท็มเพลตของเรา
            if (upfile.mimetype.match('image/')) {
                data = { file: 'upload/' + newName, fileInfo: upfile } // files.upfile
            }
            response.render('upload', data)
        })
    }
})

app.use((request, response) => {
    response.status(404)
    response.type('text/html')
    response.send('<center><h4>404 - Not Found</h4></center>')
    response.end()
})

app.listen(port, () => console.log(`Server started on port: ${port}`))
