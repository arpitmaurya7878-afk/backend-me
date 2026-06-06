import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudiary.js"
import { ApiResponse } from "../utils/Apiresponse.js";

const registerUser = asyncHandler(asyncHandler(async(req,res) =>{
   
    //get user details from frontend

  const {fullName ,email}  = req.body
  console.log("email:",email);
 
    // validation - not empty
 
    if([ 
      fullName,email,username,password].some((field) =>  
      field?.trim() === "")) 
      {
        throw new ApiError(400,"All fields are required")
      }
    // chek if user already exists: username,email
    const existedUser = User.findOne({
      $or: [{email},{username}]
     })

     if(existedUser){
      throw new ApiError (409,"user with email or username already existed")
     }
    //check for image,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath  = req.files?.avatar[0]?.path;
 // upload them to cloudinary,avatar
    if(!avatarLocalpath){
      throw new ApiError(400,"Avatar file is required")
    }
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   if(!avatar){
     throw new ApiError(400,"Avatar file is required")
   }

   
    // create user object - create entry in db 
   const  user =   User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  email,
  password,
  username: username.toLowerCase()
})
 // to check data insert hua hai ya nhi 
 const createdUser = await User.findById(user._id).select(
  "-password - refreshToken"
 )
 if(!createdUser){
  throw new ApiError(500,"Something went wrong while registering a user"
  )
 }
 // retun response
  return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
  )

    // remove password and refresh token field from response
    // check for user creation 
    // retun response


}))

//http://localhost:8000/api/v1/users/register
export {registerUser}