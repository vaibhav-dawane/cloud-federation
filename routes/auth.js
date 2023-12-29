const express = require('express');
const path = require('path');
const router = express.Router();
const firebase = require('firebase');
const session = require('express-session')


router.get('/pricing', (req, res) => {
  res.render('prices', {
    AWS: '',
    Azure:''
  });
});

router.post('/pricing', (req, res) => {
  console.log(req.body);
  let os = req.body.vmos;
  console.log(os);
  // get data from firebase realtime database
  data = []
  data1 = []
  firebase.database().ref('Azure').once('value').then(snapshot => {
    //push data to data array
    snapshot.forEach(childSnapshot => {
      data.push(childSnapshot.val());
    })
    firebase.database().ref('AWS').once('value').then(snapshot => {
      //push data to data array  
      snapshot.forEach(childSnapshot => {
        data1.push(childSnapshot.val());
      })
      var priceazure = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i].ram == req.body.ram && data[i].noofcore == req.body.vcpu && data[i].Storage == req.body.storage) {
          // console.log("data Azure:", data[i]);
          priceazure.push(data[i]);
        }
      }
     
      var priceAWS = [];
      for (let i = 0; i < data1.length; i++) {
        if (data1[i].RAM == req.body.ram && data1[i].noofcpu == req.body.vcpu && data1[i].Storage == req.body.storage) {
          // console.log("data AWS:", data1[i]);
          priceAWS.push(data1[i]);
        }
      }
      // console.log("priceAWS:", priceAWS);
      res.render('prices', {Azure:priceazure,AWS:priceAWS,os:os});
    })

  });
});
router.post('/signup', (req, res) => {
  if (req.body.password === req.body.cpassword) {
    firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.password).then(() => {
      console.log("User created");
      var emailAddress = req.body.email;
      var userName = "";
      for (var index = 0; index < emailAddress.length; index++) {
        if (emailAddress[index] == '@') {
          break;
        }
        var CharCode = emailAddress.charCodeAt(index);
        userName += emailAddress.charAt(index);

      }
      console.log(userName);

      var nodemailer = require('nodemailer');
      // Node.js program to demonstrate the
      // fs.writeFile() method

      // Import the filesystem module
      // Load the AWS SDK for Node.js
      var AWS = require('aws-sdk');
      // Set the region 
      AWS.config.update({
        region: 'ap-south-1'
      });
      const fs = require('fs');
      // Create EC2 service object
      var ec2 = new AWS.EC2({
        apiVersion: '2016-11-15'
      });

      var params = {
        KeyName: userName
      };

      // Create the key pair
      ec2.createKeyPair(params, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log(data);

          // let data = "This is a file containing a collection of books.";

          fs.writeFile("keyfile/" + userName + ".pem", data.KeyMaterial, (err) => {
            if (err)
              console.log(err);
            else {
              console.log("File written successfully\n");
              console.log("The written has the following contents:");
              console.log(fs.readFileSync("keyfile/" + userName + ".pem", "utf8"));
            }
          });
          // fs.chmod("keyfile/key4.pem", 0o400, () => {
          //     console.log("\nReading the file contents");
          //     console.log(fs.readFileSync("keyfile/key4.pem", 'utf8'));
          // });
        }
      });


      var mail = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'cloudx2023@gmail.com',
          pass: 'CloudX@23'
        }
      });
      var mailOptions = {
        from: 'cloudx2023@gmail.com',
        to: emailAddress,
        subject: '[IMPORTANT] Your AWS Credentials (Private Key) ',
        text: `Key generated for user + ${userName}
                Thank You
                Regards CLoudX Solution
        `,
        attachments: [{
          // filename and content type is derived from path
          filename: userName + '.pem',
          path: '../vm-federation/keyfile/' + userName + '.pem'
        }]
      }

      mail.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);

          const path1 = '../vm-federation/keyfile/' + userName + '.pem';

          fs.unlink(path1, function (err) {
            if (err) {
              console.error(err);
            } else {
              console.log("File removed:", path1);
            }
          });
        }
      });

      res.redirect('/login');
    }).catch((err) => {
      res.send(err.message);
    });
  } else {
    console.log('Passwords do not match');
  }
  console.log(req.body);
});

router.post('/login', (req, res) => {
  var emailAddress = req.body.email;
  var userName = "";
  for (var index = 0; index < emailAddress.length; index++) {
    if (emailAddress[index] == '@') {
      break;
    }
    var CharCode = emailAddress.charCodeAt(index);
    userName += emailAddress.charAt(index);

  }

  firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password).then(() => {
    req.session.Username = userName;
    console.log("User logged in");
    res.redirect('/pricing');
  }).catch((err) => {
    res.send(err.message);
  });

  console.log(req.body);
});
module.exports = router;