import React, { useCallback, useMemo } from 'react'
import { isNil } from 'lodash'
import urljoin from 'url-join'
import { useAxiosQueryOrUndefined } from 'src/helpers/useAxiosQuery'
import {
  Button,
  Col,
  Row,
  Toast as ToastBase,
  ToastBody as ToastBodyBase,
  ToastHeader as ToastHeaderBase,
} from 'reactstrap'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { useReloadPage } from 'src/hooks/useReloadPage'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { MdClose } from 'react-icons/md'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useRecoilState } from 'recoil'
import { lastNotifiedAppVersionAtom } from 'src/state/settings.state'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
// eslint-disable-next-line prefer-destructuring
const PACKAGE_VERSION = process.env.PACKAGE_VERSION

export interface AppJson {
  name: string
  version: string
  branchName: string
  commitHash: string
  buildNumber: string | null
  buildUrl: string | null
  domain: string
  domainStripped: string
  dataFullDomain: string
  blockSearchIndexing: string
}

export function useAppJson(): AppJson | undefined {
  const url = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window?.location.origin : '/'
    return urljoin(origin, IS_PRODUCTION ? '' : '_next/static', 'app.json')
  }, [])
  return useAxiosQueryOrUndefined(url, {
    suspense: false,
    staleTime: 0,
    refetchInterval: 60 * 60 * 1000, // 1 hour
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function UpdateNotification() {
  const { t } = useTranslation()
  const appJson = useAppJson()
  const reload = useReloadPage('/')
  const [lastNotifiedAppVersion, setLastNotifiedAppVersion] = useRecoilState(lastNotifiedAppVersionAtom)

  const reloadText = t('Reload the page to get the latest version of Nextclade.')
  const dismissText = t('Dismiss this notification. You can update Nextclade any time later by refreshing the page.')

  const dismiss = useCallback(() => {
    if (!isNil(appJson)) {
      setLastNotifiedAppVersion(appJson.version)
    }
  }, [appJson, setLastNotifiedAppVersion])

  if (isNil(appJson) || !(appJson.version > (lastNotifiedAppVersion ?? PACKAGE_VERSION ?? ''))) {
    return null
  }

  return (
    <UpdateNotificationWrapper>
      <Toast className="my-2 rounded">
        <ToastHeader className="bg-primary text-white text-bold w-100">
          <div className="w-100 d-flex">
            <h5 className="mt-1 mb-0 flex-1">{t('Update')}</h5>
            <ButtonTransparent className="ml-auto" color="transparent" onClick={dismiss} title={dismissText}>
              <MdClose color="white" />
            </ButtonTransparent>
          </div>
        </ToastHeader>
        <ToastBody>
          <Row noGutters>
            <Col>
              <p className="my-1 ">{t('A new version of Nextclade Web is available:')}</p>
              <p className="my-1 font-weight-bold">
                {/* eslint-disable-next-line only-ascii/only-ascii */}
                <span>{`${PACKAGE_VERSION} ⟶ ${appJson.version}`}</span>
                <span>{' ('}</span>
                <LinkExternal
                  href="https://github.com/nextstrain/nextclade/blob/release/CHANGELOG.md"
                  title={t('Open changelog to see what has changed in the new version.')}
                >
                  {t("What's new?")}
                </LinkExternal>
                <span>{')'}</span>
              </p>
              <p className="my-1">
                {t('Click "Update" button or refresh the page any time to get the latest updates.')}
              </p>
            </Col>
          </Row>

          <Row noGutters className="w-100 d-flex">
            <Col className="w-100 d-flex">
              <div className="ml-auto">
                <Button className="mx-1" color="link" onClick={dismiss} title={dismissText}>
                  {t('Later')}
                </Button>
                <Button className="mx-1" color="primary" onClick={reload} title={reloadText}>
                  {t('Update')}
                </Button>
              </div>
            </Col>
          </Row>
        </ToastBody>
      </Toast>
    </UpdateNotificationWrapper>
  )
}

const TOAST_WIDTH = '360px'

const UpdateNotificationWrapper = styled.div`
  position: absolute;
  right: 1rem;
  top: 50px;
  z-index: 999;
  padding: 0;
  margin: 0;
  min-width: ${TOAST_WIDTH};
`

const Toast = styled(ToastBase)`
  min-width: ${TOAST_WIDTH};
  opacity: 1 !important;
  box-shadow: ${(props) => props.theme.shadows.large};
`

const ToastBody = styled(ToastBodyBase)`
  min-width: ${TOAST_WIDTH};
  opacity: 1 !important;
  background: ${(props) => props.theme.bodyBg}; ;
`

const ToastHeader = styled(ToastHeaderBase)`
  opacity: 1 !important;

  & > strong {
    width: 100%;
  }
`
