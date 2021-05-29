/*
 * Copyright (c) 2018-2021 aetheryx & Cynthia K. Rey
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { Attributes, ComponentChild, VNode } from 'preact'
import type { Eligibility } from '@powercord/types/store'
import { h, cloneElement, Fragment } from 'preact'
import { useState, useContext, useCallback, useMemo } from 'preact/hooks'

import Spinner from '../../util/Spinner'
import MarkdownDocument from '../../docs/Markdown'
import UserContext from '../../UserContext'
import { Endpoints, Routes } from '../../../constants'

import pawaKnockHead from '../../../assets/pawa-knock-head.png'

import style from '../store.module.css'
import sharedStyle from '../../shared.module.css'

type FormLayoutProps = Attributes & { id: string, title: string, children: VNode[], eligibility?: Eligibility }
type PawaScreenProps = { headline: ComponentChild, text: ComponentChild }

const button = `${sharedStyle.button} ${style.button}`

function Intro ({ id, onNext }: { id: string, onNext: () => void }) {
  const isLoggedIn = Boolean(useContext(UserContext))
  const path = typeof location !== 'undefined' ? location.pathname : '/'

  return (
    <MarkdownDocument document={`store/${id}`} notFoundClassName={style.notfound}>
      <h2>Ready?</h2>
      {!isLoggedIn && (
        <p>
          Before you can submit a form, you must be authenticated. This is to prevent spam, and to know who to reach out
          about this submission.
        </p>
      )}

      <p>
        {isLoggedIn
          ? <button className={button} onClick={onNext}>Get started</button>
          // @ts-ignore
          : <a native href={`${Endpoints.LOGIN}?redirect=${path}`} className={button}>Login with Discord</a>}
      </p>
    </MarkdownDocument>
  )
}

function Form ({ children, onNext, onError, id }: { children: VNode<any>[], onNext: () => void, onError: () => void, id: string }) {
  // [Cynthia] this is used to force re-render of form fields, to help with errors sometimes not showing up
  const [ renderKey, setRenderKey ] = useState(0)
  const [ isSubmitting, setSubmitting ] = useState(false)
  const [ errors, setErrorsRaw ] = useState<Record<string, string>>({})
  function setErrors (e: Record<string, string>) {
    setErrorsRaw(e)
    setRenderKey((k) => ++k)
    setSubmitting(false)
  }

  const names = useMemo<string[]>(() => children.map((c) => c.props.name), [ children ])

  const onSubmitHandler = useCallback(async (e: Event) => {
    e.preventDefault()
    setSubmitting(true)
    const form = e.target as HTMLFormElement
    const obj: Record<string, any> = {}
    const err: Record<string, string> = {}

    for (const name of names) {
      const val = form[name].type === 'checkbox' ? form[name].checked : form[name].value
      obj[name] = val

      if (name.startsWith('compliance') && !val) {
        err[name] = 'You must confirm this to continue.'
      }
    }

    if (Object.keys(err).length) {
      setErrors(err)
      return
    }

    const res = await fetch(Endpoints.STORE_FORM(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(obj),
    })

    if (res.status >= 500) {
      onError()
      return
    }

    const resp = await res.json()
    if (resp.errors) {
      setErrors(resp.errors)
      return
    }

    onNext()
  }, [ onNext ])

  const statefulChildren = useMemo(
    () => children.map((c) => cloneElement(c, { error: errors[c.props.name], rk: renderKey })),
    [ children, errors, renderKey ]
  )

  return (
    <form onSubmit={onSubmitHandler}>
      {statefulChildren}
      <div className={style.note}>Make sure your form is complete and accurate before submitting. Once submitted, you won't be able to edit it!</div>
      <div>
        <button type='submit' className={button} disabled={isSubmitting}>
          {isSubmitting ? <Spinner balls/> : 'Submit'}
        </button>
      </div>
    </form>
  )
}

function PawaScreen ({ headline, text }: PawaScreenProps) {
  return (
    <div className={style.pawaScreen}>
      <img src={pawaKnockHead} alt=''/>
      <hr/>
      <h3>{headline}</h3>
      <p>{text}</p>
    </div>
  )
}

export default function FormLayout ({ id, title, children, eligibility }: FormLayoutProps) {
  const [ stage, setStage ] = useState(0)

  if (typeof eligibility !== 'number') {
    return (
      <Spinner/>
    )
  }

  if (eligibility === 1) {
    return <PawaScreen headline='This form is closed for now!' text='We currently have paused submissions, try again later.'/>
  }

  if (eligibility === 2) {
    return (
      <PawaScreen
        headline={'Sorry not sorry, you\'ve been banned'}
        text={<>
          Powercord Staff banned you from submitting this form due to abuse. To appeal the ban, please join
          our <a href={Routes.DICKSWORD} target='_blank' rel='noreferrer'>support server</a>, and ask for help
          in #misc-support.
        </>}
      />
    )
  }

  if (stage === 0) {
    return <Intro id={id} onNext={() => setStage(1)}/>
  }

  let view: VNode
  switch (stage) {
    case 1:
      view = <Form children={children} onNext={() => setStage(2)} onError={() => setStage(3)} id={id}/>
      break
    case 2:
      view = <PawaScreen headline='Received!' text='The Powercord Staff will give your form the attention it deserves soon.'/>
      break
    case 3:
      view = <PawaScreen headline='Uh, what happened?' text={'It seems like we\'re unable to process your request at this time. Please try again later!'}/>
      break
    default:
      view = <PawaScreen headline='Hehe, how did you get there cutie?' text={'I\'d happily give you a cookie but I ate them all :3'}/>
      break
  }

  return (
    <main>
      <h1>{title}</h1>
      {view}
    </main>
  )
}
