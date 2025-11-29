// handle error from srpc
import swal from 'sweetalert2'

const LS = window.localStorage

export default async res => {
  if (res.ok) return false
  await swal.fire('Error', res.err || '', 'error')
  if (res.logout) {
    LS.removeItem('grapherToken')
    window.location.href = '/'
  }
  return true
}
