const express = require('express');
const path = require('path');
const router = express.Router();
var AWS = require('aws-sdk');

//Create Only AWS VM 
router.post('/CreateAwsVM', (req, res) => {
    let vname = req.body.vname;
    let vmos = req.body.vmos;
    let vmtype = req.body.vmtype;

    let originalString = `#!/bin/bash
    sudo su
    yum update -y
    yum install httpd -y
    service  httpd start
    sudo yum install git -y
    cd /var/www/html
    git clone ${req.body.github}`;

    let bufferObj = Buffer.from(originalString, "utf8");

    let base64String = bufferObj.toString("base64");


    // Load credentials and set region from JSON file
    AWS.config.update({
        region: 'ap-south-1'
    });

    // Create EC2 service object
    var ec2 = new AWS.EC2({
        apiVersion: '2016-11-15'
    });

    // AMI is amzn-ami-2011.09.1.x86_64-ebs

    var params = {
        BlockDeviceMappings: [{
            DeviceName: "/dev/sdh",
            Ebs: {
                VolumeSize: 100
            }
        }],
        ImageId: vmos,
        InstanceType: vmtype,
        KeyName: "MacKey",
        MaxCount: 1,
        MinCount: 1,
        SecurityGroupIds: [
            "sg-0354c041434f4fee3"
        ],
        SubnetId: "subnet-0765e0a81f08fb26a",

        TagSpecifications: [{
                ResourceType: "instance",
                Tags: [{
                    Key: "Name",
                    Value: req.session.Username
                }]

            }

        ],
        UserData: base64String
    };

    ec2.runInstances(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else res.redirect('/listaws'); // successful response
        /*
        data = {
        }
        */
    });


})



router.get('/listaws', (req, res) => {
    AWS.config.update({
        region: 'ap-south-1'
    });
    // Create EC2 service object
    var ec2 = new AWS.EC2({
        apiVersion: '2016-11-15'
    });

    var params = {
        DryRun: false,
        Filters: [
            {
              Name: 'tag:Name',
              Values: [req.session.Username]
            }
          ]
    };

    // Call EC2 to retrieve policy for selected bucket
    ec2.describeInstances(params, function (err, data) {
        if (err) {
            console.log("Error", err.stack);
        } else {
            var result = JSON.stringify(data);
            const data1 = JSON.parse(result)


            res.render('listaws', {
                data: data1.Reservations,
                data2: result[0],
                Name:req.session.Username
            })
            // console.log("Image ID :",);
        }
    });
})

router.get('/terminateAws', (req, res) => {
    AWS.config.update({
        region: 'ap-south-1'
    });
    // Create EC2 service object
    var ec2 = new AWS.EC2({
        apiVersion: '2016-11-15'
    });
    var awst = req.body.awsterminate;
    var act = req.body.action;

    if (act == "Terminate") {
        for (var i = 1; i < awst.length; i++) {
            const params = {
                InstanceIds: [
                    awst[i]
                ]
            };

            ec2.terminateInstances(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                } else {
                    console.log(data); // successful response
                }
            });
        }
    } else {
        // setup instance params
        for (var i = 1; i < awst.length; i++) {
            const params = {
                InstanceIds: [
                    awst[i]
                ]
            };
            ec2.stopInstances(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                } else {
                    console.log("Instance Stopped"); // successful response
                }
            });
        }
    }

})
module.exports = router;
