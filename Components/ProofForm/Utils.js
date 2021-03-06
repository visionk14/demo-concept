import PropTypes from 'prop-types'
import { toast } from 'Components/Toast'

const Utils = ({ children }) =>
  children({
    blobToBase64: blob => {
      const toString = Object.prototype.toString
      const isBlob = x => {
        return x instanceof Blob || toString.call(x) === '[object Blob]'
      }

      return new Promise((resolve, reject) => {
        if (!window.FileReader) reject(new Error('no fileReader object available'))
        if (!isBlob(blob)) reject(new Error('provided argument is not blob'))

        const reader = new window.FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => resolve(reader.result)
      })
    },
    prepareData: async ({ formsData, api, blobToBase64, errorMsg }) => {
      const { personal, identification, service, scribes } = formsData
      const { id, idImage, userImage } = identification
      const { serviceImage } = service
      const { selectedScribe } = scribes

      try {
        const idImageBase64 = await blobToBase64(idImage)
        const userImageBase64 = await blobToBase64(userImage)
        const serviceImageBase64 = await blobToBase64(serviceImage)

        const proofFormData = {
          ...personal,
          id,
          idImageBase64,
          userImageBase64,
          serviceImageBase64
        }

        return { proofFormData, selectedScribe }
      } catch (e) {
        api.setSubmitting(false)
        toast.error(errorMsg, { position: toast.POSITION.BOTTOM_LEFT })
      }
    },
    onSendToScribe: async ({ proofFormData, selectedScribe, api, signalHub, accounts, web3, successMsg, errorMsg }) => {
      const { channel, broadcast } = signalHub
      const proofData = { id: new Date().getTime(), values: JSON.stringify(proofFormData) }
      const message = JSON.stringify(proofData)

      const hash = web3.sha3(message)
      const address = accounts.addresses[0]

      web3.eth.sign(address, hash, (err, res) => {
        if (err) {
          api.setSubmitting(false)
          toast.error(errorMsg, { position: toast.POSITION.BOTTOM_LEFT })
        }

        if (res) {
          api.setSubmitting(false)
          toast.info(successMsg, { position: toast.POSITION.BOTTOM_LEFT })

          const signedHash = res
          broadcast(channel, { selectedScribe, proof: { address, signedHash, message } })
        }
      })
    }
  })

Utils.propTypes = {
  children: PropTypes.func
}

export { Utils }
