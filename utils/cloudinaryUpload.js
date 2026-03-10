const cloudinary = require("../config/cloudinary");
const sharp = require("sharp");

/**
 * Upload image buffer to Cloudinary with specified folder structure
 * @param {Buffer} buffer - Image buffer from multer
 * @param {String} entityType - Type of entity: 'student', 'college', 'company', 'school', 'university'
 * @param {String} imageType - Type of image: 'profile', 'banner', 'logo'
 * @param {Object} options - Optional resize/quality settings
 * @returns {Promise<Object>} - Cloudinary result with secure_url and public_id
 */
const uploadToCloudinary = async (buffer, entityType, imageType, options = {}) => {
  try {
    // Define default dimensions based on image type
    const defaults = {
      profile: { width: 400, height: 400, quality: 85 },
      banner: { width: 1600, height: 400, quality: 85 },
      logo: { width: 300, height: 300, quality: 90 },
    };

    const settings = { ...defaults[imageType], ...options };

    // Process image with sharp before uploading
    const processedBuffer = await sharp(buffer)
      .resize(settings.width, settings.height, { fit: "cover" })
      .jpeg({ quality: settings.quality })
      .toBuffer();

    // Create folder path: entityType/imageType (e.g., "student/profile", "company/banner")
    const folder = `ccs/${entityType}/${imageType}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          format: "jpg",
          transformation: [
            { quality: "auto:good" },
            { fetch_format: "auto" }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(processedBuffer);
    });
  } catch (error) {
    console.error("Image processing error:", error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary by public_id
 * @param {String} publicId - Cloudinary public_id of the image
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    console.log("trying to delete the old image from the cloudinary------------>", publicId)
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
