the flow is should be its a voice cloning of people you love to chat with chatgpt

user sign in . signup using email or google or facebook or apple account  otp send , we put otp, done !(with option to resend if needed, message sends otp, expires)

home page user gets the favorites if needed members
recently listened members (used) if any

user can get plans to subscribe (created from dashboard using stripe/dashboard)

each member is in a tree -> so tree then member in it
crud trees of members
crud members
api to clone voice is on another project
 api for chat, chat use llm gpt api , result from gpt goes to voice clone, api return the voice cloned
trees has background image
members has images
chat not stored in the db, so no need for sessions
we can duplicate trees
we can see members details/trees update edit delete
details of member return name, relation type (father , son ...) Biography Private Notes

add member inputs are photo (not required) Name Date of Birth Bio Custom greeting , Add relation 1, Nickname or boolean Not a Related member, and a voice to be added upload (voice)

for tree is just photo (not required) and name

for user we have

personal information : name Username and email
Manage your subscription and payment methods: Current plan (Name Plan, and ex: $80.00 per month)
Upgrade Plan function
Cancel Plan

and we get Parment Method used with the serial code and exp and is default or not and we can add Add payment method

Billing history function

change password : current , new pass and Confirm new password

notifications settings
Receive notifications about new features boolean and functionality
Get notified when you receive messages boolean and functionality
Receive updates about billing and invoices boolean and functionality


security Two-Factor Authentication flow and enable/disable
Logged-In Devices list, device name, app or web, software used

notifications and examples and features
users can for example Maroun Smith shared “My Family” tree with you and accept and decline
Your monthly backup is ready.
“My Family” tree was successfully backed up.
“It’s been 1 year since “Grandma” was added.”
Today is Ralph’s birthday 🎉

member can have versions and select the one to be used for voice cloning,
add new version by uploading new voice for member
in user Archieve
storage usage of each user (from files uploaded (voices and images))
Recent Sessions

and can Search recordings...

each recording data will have
retrained member name
Version name version 1.0
last backup Mar 1, 2026
Duration for example 30s
Size

with option to download
we can get Preservation Plans  Monthly/Yearly

plan has : price name  description and points for features

and each user after subscription will have credits from the subscription and add or reduce on usage or subscription or refund options and add from dashboard

 create a file of todos and make/ decompose tasks on each level (db, models files, controllers, services, routes apis)