require('dotenv').config()
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const serviceAccount = require('../firebase/creds.json')

initializeApp({
  credential: cert(serviceAccount)
})
const db = getFirestore()

module.exports = { db }
