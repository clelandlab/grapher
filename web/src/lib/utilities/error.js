// handle error from srpc
import swal from 'sweetalert2'

const LS = window.localStorage

export default res => {
  if (res.ok) return false
  swal.fire('Error', res.err || '', 'error')
  if (res.logout) {
    LS.removeItem('grapherToken')
    window.location.href = '/'
  }
  return true
}
