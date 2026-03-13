const otpGenerator = require('otp-generator')

const otp = otpGenerator.generate(6,{
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false,
})