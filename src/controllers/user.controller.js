import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(asyncHandler(async(req,res) =>{
    res.status(200).json({
        message:"Arpit is bad boy"
    })
}))

//http://localhost:8000/api/v1/users/register
export {registerUser}