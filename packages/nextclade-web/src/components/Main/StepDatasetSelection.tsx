import { useRouter } from 'next/router'
import React, { useCallback } from 'react'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import styled from 'styled-components'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Row as RowBase, Col as ColBase } from 'reactstrap'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetAutosuggestionResultsList } from 'src/components/Main/DatasetSelector'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'

export interface StepDatasetSelectionProps {
  toLanding(): void
}

export function StepDatasetSelection() {
  return (
    <Container>
      <Main>
        <DatasetSelection />
      </Main>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const MainFixed = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 20%;
  margin-top: 12px;
  padding: 0 15px;
`

function DatasetSelection() {
  const dataset = useRecoilValue(datasetCurrentAtom)
  const setDataset = useSetRecoilState(datasetCurrentAtom)

  const { push } = useRouter()
  const toMainPage = useCallback(() => {
    void push('/') // eslint-disable-line no-void
  }, [push])

  return (
    <Wrapper>
      <Row noGutters className="flex-column flex-lg-row h-100">
        <Col lg={6}>
          <Container>
            <MainFixed>
              <QuerySequenceList toMainPage={toMainPage} />
            </MainFixed>
            <Main>
              <DatasetAutosuggestionResultsList datasetHighlighted={dataset} onDatasetHighlighted={setDataset} />
            </Main>
          </Container>
        </Col>
        <Col lg={6}>
          <DatasetCurrent />
        </Col>
      </Row>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Row = styled(RowBase)`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Col = styled(ColBase)`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`
