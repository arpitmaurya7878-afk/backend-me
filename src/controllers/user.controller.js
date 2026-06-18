import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudiary.js"
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{
  try{
    const user = await User.findById(userId)
   const refreshToken = user.generateRefreshToken()
   const accessToken =  user.generateAccessToken() 
   user.refreshToken = refreshToken
   await user.save({validateBeforeSave: false})
   return {accessToken,refreshToken}
  }
  catch(error)
  {
    throw new ApiError(500,"Something went wrong while generating refresh access token ")
  }
}

const registerUser = asyncHandler(async(req,res) =>{
   
    //get user details from frontend

  const {fullName ,email,username,password}  = req.body
  console.log("email:",email);
 
    // validation - not empty
 
    if([ 
      fullName,email,username,password].some((field) =>  
      field?.trim() === "")) 
      {
        throw new ApiError(400,"All fields are required")
      }
    // chek if user already exists: username,email
    const existedUser =  await User.findOne({
      $or: [{email},{username}]
     })

     if(existedUser){
      throw new ApiError (409,"user with email or username already existed")
     }
    //check for image,check for avatar
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath  = req.files?.coverImage[0]?.path;
   
 // upload them to cloudinary,avatar
    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is required")
    }

console.log("Avatar Path:", avatarLocalPath);



   const avatar = await uploadOnCloudinary(avatarLocalPath)
   console.log("Avatar Upload Response:", avatar);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   if(!avatar){
     throw new ApiError(400,"Avatar file is required")
   }

   
    // create user object - create entry in db 
   const  user =  await User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  email,
  password,
  username: username.toLowerCase()
})
 // to check data insert hua hai ya nhi 
 const createdUser = await User.findById(user._id).select("-password -refreshToken")
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


})


//login user 
 const loginUser = asyncHandler(async(req,res) => {
  //req body -> data 
  const { username, email,password} = req.body;
  console.log(req.body)
  // username or email
  if(!(username||email)){
    throw new ApiError(400,"username or email is required")
    }
   // find the user 
  const user = await User.findOne({
    $or: [{username},{email}]
  })

if (!user){
  throw new ApiError(404,"User does not exist")
}
  //password  check
  const isPasswordValid =await user.isPasswordCorrect(password)
  if (!isPasswordValid){
  throw new ApiError(401,"Invalid user credential")
}
  // access and refresh token 
   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

   // send cookies 
   const loggedInUser = await User.findById(user._id).
   select("-password -refreshToken")
   const options = {
    httpOnly: true,
    secure: true
   }
   return res
   .status(200)
   .cookie("accessToken", accessToken,options)
   .cookie("refreshToken", refreshToken,options)
   .json(
    new ApiResponse(
      200,{
        user: loggedInUser,accessToken,refreshToken
      },
      "user logged in successfully"
    )
   )
 })

 const logoutUser =  asyncHandler(async(req,res) => 
{
   await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined
        }
      },
      {
        new: true

      }
    )
 const options = {
    httpOnly: true,
    secure: true
     } n  
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User logged out "))
   })

 const refreshAccessToken = asyncHandler(async(req,res)
=> {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
   
  if(incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
  }
  try {
     const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?.id)
    if(!user){
      throw new ApiError(401,"invalid refresh token")
    }
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
    const {accessToken,newrefreshToken} = await
    generateAccessAndRefreshTokens(user._id)
    
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
      new ApiResponse(
        200,
        {accessToken,refreshToken: newrefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }

})


const changeCurrentPassword = asyncHandler(async(req,res) =>
{

  const {oldPassword,newPassword} = req.body
  const  user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.
  isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid  old password")
  }
  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json{new ApiResponse(200,{},"password changed succesfully")}
})


const getCurrentUser = asyncHandler(async(req,res) => {
  return res
  .status(200)
  .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
  const {fullName,email} = req.body

  if(!(fullName || email )){
    throw new ApiError(400,"All the field are required")
  }
  const user =await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email
      }
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"account details updated successfully"))
} )


const updateUserAvatar = asyncHandler(async(req,res) => {
  const avatarLocalPath =  req.file?.path
    if (!avatarLocalPath) {
      throw new Error(400,"Avatar file is missing");
      }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if ( !avatar.url) {
   throw new Error(400,"error while uploading on Avatar"); 
  }
  const user =   await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
       avatar: avatar.url
    }},
    {new: true}
  ).select(-password)

   return res
  .status(200)
  .json(
    new ApiResponse(200,user,"Avatar updated successfully")
  )

})


const updateUserCoverImage = asyncHandler(async(req,res) => {
  const CoverImageLocalPath =  req.file?.path
    if (!CoverImageLocalPath) {
      throw new Error(400,"CoverImage  file is missing");
      }
  const coverImage  = await uploadOnCloudinary(CoverImageLocalPath)
  if ( !CoverImage.url) {
   throw new Error(400,"error while uploading CoverImage"); 
  }
  const user =  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
       coverImage: coverImage.url
           }
     },
    {new: true}
  ).select(-password)
  return res
  .status(200)
  .json(
    new ApiResponse(200,user,"Cover image updated successfully")
  )

})


const getUserChannelProfile = asyncHandler(async(req,res) => {
 const {username} = req.params
 if (!username?.trim()) {
  throw new ApiError(400,"username is missing")
 }
 const channel = User.aggregate([
  {
    $match: {
      username: username?.toLowerCase()
    }
  },
  {
    $lookup: {
      from: "Subscription",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"

    }
  },
   {
     $lookup: {
      from: "Subscription",
      localField: "_id",
      foreignField: "subscriber",
      as: "subscribedTo"

    }
   },
   {
    $addFields:{
      subscribersCount: {
        $size: "$subscribers"
      },
      channelSubscribedToCount: {
        $size: "$subscribedTo"
      },
      isSubscribed:{
       if: {$in: [req.user?._id,"$subscribers.subscriber"]}  ,
       then: true,
       else: false
      }
    }
   },
   {
    $project: {
      fullName: 1,
      username: 1,
       subscribersCount:1,
       channelSubscribedToCount:1,
       isSubscribed:1,
       email:1,
       coverImage:1,
       avatar:1
        }
   }

 ])
 if (!channel?.length) {
  throw new ApiError(404,"channel does not exists")
 }
 return res 
 .status(200)
 .json(new ApiResponse(200,channel[0],"User  channel fetched succesfully"))
})

 
const getWatchHistory  = asyncHandler(async(req,res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName:1,
                    username:1,
                    avatar:1,

                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0].watchHistory,"Watch history fetched successfully")
  )
})





//http://localhost:8000/api/v1/users/register
export {
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  registerUser
}