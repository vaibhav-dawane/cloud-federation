const express = require('express');
const path = require('path');
const app = express();
var AWS = require('aws-sdk');
const firebase = require('firebase');
AWS.config.update({ region: 'ap-south-1' });
const session = require('express-session')
const verify = require('./verify');
const bodyParser = require("body-parser");

const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { ResourceManagementClient } = require("@azure/arm-resources");
const { StorageManagementClient } = require("@azure/arm-storage");
const { NetworkManagementClient } = require("@azure/arm-network");
const { redirect } = require('express/lib/response');

//--------------------------------------------SESSION INFO----------------------------------------------
app.use(session({
  secret: 'CloudisBest',
  resave: true,
  saveUninitialized: true
}))

//----------------------------------------------VIEW FILES-----------------------------------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//----------------------------------------------PUBLIC FILES-----------------------------------------------------
const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));


//-------------------------------------------FIRBASE-----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAZ1lUxGFJtLiEZgQa6mzTuwfQP8naMu3A",
  authDomain: "cloudx-5f3e0.firebaseapp.com",
  databaseURL: "https://cloudx-5f3e0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cloudx-5f3e0",
  storageBucket: "cloudx-5f3e0.appspot.com",
  messagingSenderId: "1051769303514",
  appId: "1:1051769303514:web:d63d88712694bb86d110e3"
};
firebase.initializeApp(firebaseConfig);

app.use(bodyParser.urlencoded({
  extended: true
}));

//-------------------------------------------Routes-----------------------------------------------------
//app.use('/', require('./routes/allClouds'));
app.use('/', require('./routes/AWS'));
app.use('/', require('./routes/GCP'));
app.use('/', require('./routes/Azure'));
app.use('/', require('./routes/auth.js'));

let credentials = null;

// Azure platform authentication
const clientId = "34b142da-c7c6-4e7b-bbc7-207fe3406d42";
const tenantId = "e45a916f-a0c5-4ac3-9d1a-b12681eee1b7";
const secret = "oMU8Q~tptmWlU.WjW4zyuEK949Pd~Dqv-UxsQaBw";
const subscriptionId ="b29c1332-2be9-4c98-8a49-818984141b2f";

//-------------------------------------------render index-----------------------------------------------------
app.get('/',(req,res)=>{
    res.render('index');
})

//-------------------------------------------render Create Azure VM-----------------------------------------------------
app.post('/CreateAzure', (req, res) => {

  let vname = req.body.vname;
  let vmgroup = req.body.vmgroup;
  let vnetname = req.body.vnet;
  let azpublic = req.body.azpublic;
  let aznic = req.body.aznic;
  let username = req.body.username;
  let password = req.body.password;
  // if (vmcount == '1') {

  //   // Load credentials and set region from JSON file
  //   AWS.config.update({ region: 'ap-south-1' });

  //   // Create EC2 service object
  //   var ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  //   // AMI is amzn-ami-2011.09.1.x86_64-ebs
  //   var instanceParams = {
  //     ImageId: 'ami-052cef05d01020f1d',
  //     InstanceType: vmtype,
  //     KeyName: 'fed-key',
  //     MinCount: 1,
  //     MaxCount: vmcount,

  //   };

  //   // Create a promise on an EC2 service object
  //   var instancePromise = new AWS.EC2({ apiVersion: '2016-11-15' }).runInstances(instanceParams).promise();

  //   // Handle promise's fulfilled/rejected states
  //   instancePromise.then(
  //     function (data) {
  //       console.log(data);
  //       var instanceId = data.Instances[0].InstanceId;
  //       console.log("reated instance", instanceId);
  //       // Add tags to the instance
  //       tagParams = {
  //         Resources: [instanceId], Tags: [
  //           {
  //             Key: 'Name',
  //             Value: vname
  //           }
  //         ]
  //       };
  //       // Create a promise on an EC2 service object
  //       var tagPromise = new AWS.EC2({ apiVersion: '2016-11-15' }).createTags(tagParams).promise();
  //       // Handle promise's fulfilled/rejected states
  //       tagPromise.then(
  //         function (data) {
  //           console.log("Instance tagged");
  //           res.redirect('/listaws');
  //         }).catch(
  //           function (err) {
  //             console.error(err, err.stack);
  //           });
  //     }).catch(
  //       function (err) {
  //         console.error(err, err.stack);
  //       });

  // }
  if (vnetname != '') {
    const credentials = new DefaultAzureCredential();

    // Azure services
    const resourceClient = new ResourceManagementClient(credentials, subscriptionId);
    const computeClient = new ComputeManagementClient(credentials, subscriptionId);
    const storageClient = new StorageManagementClient(credentials, subscriptionId);
    const networkClient = new NetworkManagementClient(credentials, subscriptionId);

    async function main() {
      try {
        // create resource group
        const group = await resourceClient.resourceGroups.createOrUpdate(
          req.session.Username,
          {
            location: "eastasia",
          }
        );
        // create vnet and subnet
        const vnet = await networkClient.virtualNetworks.createOrUpdate(
          group.name,
          vnetname,
          {
            addressSpace: {
              addressPrefixes: ["10.0.0.0/16"],
            },
            location: group.location,
            subnets: [{ name: "default", addressPrefix: "10.0.0.0/24" }],
          }
        );
        // create public ip
        const ip = await networkClient.publicIPAddresses.createOrUpdate(
          group.name,
          azpublic,
          {
            location: group.location,
            publicIPAllocationMethod: "Dynamic",
          }
        );
        // create nic
        const nic = await networkClient.networkInterfaces.createOrUpdate(
          group.name,
          aznic,
          {
            location: group.location,
            ipConfigurations: [
              {
                name: "test",
                privateIPAllocationMethod: "Dynamic",
                subnet: vnet.subnets[0],
                publicIPAddress: ip,
              },
            ],
          }
        );
        // get you custom  image
        // const image = await computeClient.images.get("testdf78", "RedHat");
        //create vm
        computeClient.virtualMachines.createOrUpdate(group.name, vname, {
          location: group.location,
          hardwareProfile: {
            vmSize: "Standard_B1s",
          },
          storageProfile: {
            imageReference: {
              publisher: "Canonical",
              offer: "UbuntuServer",
              sku: "14.04.3-LTS",
              version: "14.04.201805220"
            },
            osDisk: {
              caching: "ReadWrite",
              managedDisk: {
                storageAccountType: "Standard_LRS",
              },
              name: "testdf1osdisk",
              createOption: "FromImage",
            },
          },
          osProfile: {
            computerName: req.session.Username,
            adminUsername: username,
            adminPassword: password,
            linuxConfiguration: {
              patchSettings: { patchMode: "ImageDefault" },
            },
          },
          networkProfile: {
            networkInterfaces: [
              {
                id: nic.id,
              },
            ],
          },
          diagnosticsProfile: {
            bootDiagnostics: {
              enabled: true,
            },
          },
        });
      } catch (error) {
        console.log(error);
      }
    }

    main().then(() => {
      console.log("Launches Successfully  " + vmgroup);
      res.redirect('/listazure');
    })
      .catch((err) => {
        console.log(err);
      });
  }
  // else {
  //   const Compute = require('@google-cloud/compute');
  //   const http = require('http');

  //   const compute = new Compute();
  //   const sourceImage = 'projects/debian-cloud/global/images/family/debian-10';
  //   const networkName = 'global/networks/default';
  //   const zone = compute.zone('us-central1-a');

  //   // Create a new VM, using default ubuntu image. The startup script
  //   // installs Node and starts a Node server.
  //   const config = {
  //     machineType: vmtype,
  //     os: vmos,
  //     http: true,
  //     disks: [
  //       {

  //         initializeParams: {
  //           diskSizeGb: vmdisk,
  //           sourceImage,
  //         },
  //         autoDelete: true,
  //         boot: true,

  //       }],
  //     metadata: {
  //       items: [
  //         {
  //           key: 'startup-script',
  //           value: `#! /bin/bash
  //       # Get Node version manager and install Node 8.
  //       curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.9/install.sh | bash
  //       export NVM_DIR="$HOME/.nvm"
  //       [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  //       nvm install 8
  //       # Install git
  //       apt-get --assume-yes install git
  //       # Clone sample application and start it.
  //       git clone https://github.com/fhinkel/nodejs-hello-world.git
  //       cd nodejs-hello-world
  //       npm start &`
  //         },
  //       ],
  //     },
  //   };

  //   const vm = zone.vm(vname);

  //   (async () => {
  //     try {
  //       const data = await vm.create(config);
  //       const operation = data[1];
  //       await operation.promise();

  //       // External IP of the VM.
  //       const metadata = await vm.getMetadata();
  //       const ip = metadata[0].networkInterfaces[0].accessConfigs[0].natIP;
  //       console.log(`Booting new VM with IP http://${ip}...`);

  //       // Ping the VM to determine when the HTTP server is ready.
  //       let waiting = true;
  //       const timer = setInterval(
  //         ip => {
  //           http
  //             .get('http://' + ip, res => {
  //               const statusCode = res.statusCode;
  //               if (statusCode === 200 && waiting) {
  //                 waiting = false;
  //                 clearTimeout(timer);
  //                 // HTTP server is ready.
  //                 console.log('Ready!');
  //                 console.log(ip);
  //               }
  //             })
  //             .on('error', () => {
  //               // HTTP server is not ready yet.
  //               process.stdout.write('.');
  //             });
  //         },
  //         2000,
  //         ip
  //       );
  //     }
  //     catch (error) {
  //       console.error(error);
  //     }
  //     res.redirect('/gcplistvm');
  //   })();
  // }

})
//--------------------------------------------------Create VM Form-------------------------------------------------------------------
app.post('/form',(req, res) => {
  let type = req.body.type;
  let vmos = req.body.vmos;
  console.log(type);
  console.log(vmos);
  if (req.session.Username) {
    res.render('Createallvm', {Name:req.session.Username,Type:type,Vmos:vmos});
  }else{
    res.redirect('/login');
  }
})


//--------------------------------------------------logout-------------------------------------------------------------------
app.get('/logout',(req, res) => {
  req.session.destroy();
  res.redirect('/');
})

//--------------------------------------------------List aws-------------------------------------------------------------------
app.get('/listaws', (req, res) => {

  AWS.config.update({ region: 'ap-south-1' });
  // Create EC2 service object
  var ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  var params = {
    DryRun: false
  };

  // Call EC2 to retrieve policy for selected bucket
  ec2.describeInstances(params, function (err, data) {
    if (err) {
      console.log("Error", err.stack);
    } else {
      var result = JSON.stringify(data);
      const data1 = JSON.parse(result)


      res.render('index', { data: data1.Reservations, data2: result[0] })
      // console.log("Image ID :",);
    }
  });
})
//--------------------------------------------------List azure-------------------------------------------------------------------
app.get('/listazure', (req, res) => {

  const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
  const { ComputeManagementClient } = require('@azure/arm-compute');
  var NetworkManagementClient = require('azure-arm-network');
  var msRestAzure = require('ms-rest-azure');


  let credentials = null;

// Azure platform authentication
const clientId = "34b142da-c7c6-4e7b-bbc7-207fe3406d42";
const tenantId = "e45a916f-a0c5-4ac3-9d1a-b12681eee1b7";
const secret = "oMU8Q~tptmWlU.WjW4zyuEK949Pd~Dqv-UxsQaBw";
const subscriptionId ="b29c1332-2be9-4c98-8a49-818984141b2f";
  var exec = require('child_process').exec;

  var credentials1 = new msRestAzure.ApplicationTokenCredentials(clientId, tenantId, secret);
  var networkClient = new NetworkManagementClient(credentials1, subscriptionId);

  // development
  credentials = new ClientSecretCredential(tenantId, clientId, secret);
  // console.log("development");

  async function listVMs() {

    const computeClient = new ComputeManagementClient(credentials, subscriptionId);
    const virtualMachinesListAllOptionalParams = {
      statusOnly: "true",
      resourceGroupName: "udresourcegroup",

    };
    const result = await computeClient.virtualMachines.listAll(virtualMachinesListAllOptionalParams);
    const result1 = await computeClient.virtualMachines.listAll();
    var final = [];
    // console.log(result);
    // console.log(result1);

    result.forEach(function(view) {
      if(view.name == req.session.Username){
        final.push(view);
      }
    });
    console.log(final);

    var final1 = [];
    // console.log(result);
    // console.log(result1);

    result1.forEach(function(view1) {
      if(view1.name == req.session.Username){
        final1.push(view1);
      }
    });
    console.log(final1);
    // 
    // 


   res.render('listazure', { dataazure: final, dataazure2: final1,Name:req.session.Username })

  }
  listVMs()

})

//--------------------------------------------------List gcp-------------------------------------------------------------------
app.get('/gcplistvm', (req, res) => {
  const Compute = require('@google-cloud/compute');

  const compute = new Compute();

  global.temp;

  async function listGCP() {

    // const zone = await compute.zone('us-east1-b');
    const data = await compute.getVMs({
      maxResult: 1
    });
    var result = JSON.stringify(data);
    temp = JSON.parse(result)
    return await temp
  }


  (async () => {
    const data = await listGCP()
    res.render('gcplistvm', { datagcp: data })
  })()

})
//--------------------------------------------------Terminate AWS-------------------------------------------------------------------
app.post('/terminateaws', (req, res) => {

  AWS.config.update({ region: 'ap-south-1' });
  // Create EC2 service object
  var ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
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
          console.log(data);           // successful response
        }
      });
    }
  }
  else {
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
          console.log("Instance Stopped");           // successful response
        }
      });
    }
  }



  // for(let i=0;i<awst.length;i++){

  // }
  // setup params

})


//--------------------------------------------------Terminate azure-------------------------------------------------------------------
app.post('/azureaction', (req, res) => {


  var vname = req.body.azurevm;
  var vres = req.body.azureres;
  console.log(vname);
  console.log(vres);


  const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
  const { ComputeManagementClient } = require('@azure/arm-compute');
  var NetworkManagementClient = require('azure-arm-network');
  var msRestAzure = require('ms-rest-azure');


  // Azure authentication in environment variables for DefaultAzureCredential
  let credentials = null;

// Azure platform authentication
const clientId = "34b142da-c7c6-4e7b-bbc7-207fe3406d42";
const tenantId = "e45a916f-a0c5-4ac3-9d1a-b12681eee1b7";
const secret = "oMU8Q~tptmWlU.WjW4zyuEK949Pd~Dqv-UxsQaBw";
const subscriptionId ="b29c1332-2be9-4c98-8a49-818984141b2f";
  var exec = require('child_process').exec;

  var credentials1 = new msRestAzure.ApplicationTokenCredentials(clientId, tenantId, secret);
  var networkClient = new NetworkManagementClient(credentials1, subscriptionId);

  // development
  credentials = new ClientSecretCredential(tenantId, clientId, secret);
  // console.log("development");
  for (var i = 1; i < vname.length; i++) {
    const stopVM = async () => {

      const computeClient = new ComputeManagementClient(credentials, subscriptionId);
      const result = await computeClient.virtualMachines.powerOff(vres[i], vname[i]);
      console.log(JSON.stringify(result));
    }

    stopVM().then((result) => {
      console.log(result);
    }).catch(ex => {
      console.log(ex);
    });
  }
})

//--------------------------------------------------Terminate gcp-------------------------------------------------------------------
app.post('/gcpaction', (req, res) => {

  const compute = require('@google-cloud/compute');

  async function stopInstance() {
    const instancesClient = new compute.InstancesClient();

    const [response] = await instancesClient.stop({
      project: projectId,
      zone,
      instance: instanceName,
    });
    let operation = response.latestResponse;
    const operationsClient = new compute.ZoneOperationsClient();

    // Wait for the operation to complete.
    while (operation.status !== 'DONE') {
      [operation] = await operationsClient.wait({
        operation: operation.name,
        project: projectId,
        zone: operation.zone.split('/').pop(),
      });
    }

    console.log('Instance stopped.');
  }

  stopInstance();
});
  //--------------------------------------------------redirect Home-------------------------------------------------------------------
app.get('/home', (req, res) => {
  res.render('home');
});

//--------------------------------------------------redirect Login-------------------------------------------------------------------
app.get('/login', (req, res) => {
  if(req.session.Username){
    console.log(req.session.Username);
    res.redirect('/form');
  }else{
    res.render('login');
  }

});

//--------------------------------------------------redirect sign in-------------------------------------------------------------------
app.get('/signnew', (req, res) => {
  res.render('signup');

});

PORT = 3100
HOST = ''
app.listen(PORT, () => console.log(`App listening on port ${PORT}`),);
