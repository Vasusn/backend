import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend

  const { username, email, password, fullName } = req.body;

  // console.log(`username: ${username},\n email: ${email},\n password: ${password},\n fullName: ${fullName}`);

  //validation - not empty
  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check is user already exists : username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log(`existedUser: ${existedUser}`)

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exisits");
  }

  //check for image, avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // console.log(`avatarLocalPath: ${avatarLocalPath},\ncoverImageLocalPath:${coverImageLocalPath}`)

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //upload them to cloudinary , avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //create user object: create entry in db
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  //remove passwoerd and refresh token from response
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // console.log(`\ncreateUser: ${createUser}`);

  //check for user creation
  if (!createUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //return res
  return res
    .status(201)
    .json(new ApiResponse(200, createUser, "User registered successfully"));
});

export { registerUser };
