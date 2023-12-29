module.exports = {
    issession: (req, res, next) =>{
        if(req.session.UserName){
            next();
        }else{
            console.log("User not logged in");
        }
    }
}
// Export Modules 