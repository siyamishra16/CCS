// import cloudinary from "../config/cloudinary.js";
// import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
// import User from "../models/User.js";

// export const updateProfileImage = async (req, res) => {
//   try {
//     const userId = req.user.id; // from auth middleware
//     const file = req.file;

//     if (!file) return res.status(400).json({ message: "Image file required" });

//     const user = await User.findById(userId);

//     // ✅ If already exists -> delete old
//     if (user.profileImage?.public_id) {
//       await cloudinary.uploader.destroy(user.profileImage.public_id);
//     }

//     // ✅ Upload new
//     const result = await uploadToCloudinary(file.buffer, "users/profile");

//     user.profileImage = {
//       url: result.secure_url,
//       public_id: result.public_id,
//     };

//     await user.save();

//     res.json({
//       message: "Profile image updated successfully",
//       profileImage: user.profileImage,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };




// remove the image from the cloudinary

// export const removeProfileImage = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const user = await User.findById(userId);

//     if (user.profileImage?.public_id) {
//       await cloudinary.uploader.destroy(user.profileImage.public_id);
//     }

//     user.profileImage = { url: "", public_id: "" };
//     await user.save();

//     res.json({ message: "Profile image removed" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
