import { useEffect } from 'react'
import { useIntl } from 'react-intl'

function DocumentMetadata() {
  const intl = useIntl()
  const title = intl.formatMessage({ id: 'app.title' })
  const description = intl.formatMessage({ id: 'app.description' })

  useEffect(() => {
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [description, title])

  return null
}

export default DocumentMetadata
