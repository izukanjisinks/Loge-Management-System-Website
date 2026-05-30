import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Uploads a document file to Firebase Storage under bookings/documents/.
 * Returns the public download URL.
 * Calls onProgress(0-100) if provided.
 */
export async function uploadBookingDocument(file, onProgress) {
  const ext      = file.name.split('.').pop()
  const filename = `${randomId()}.${ext}`
  const ref      = storageRef(storage, `bookings/documents/${filename}`)
  const task     = uploadBytesResumable(ref, file)

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    )
  })
}
