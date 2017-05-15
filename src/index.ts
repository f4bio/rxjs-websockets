import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { w3cwebsocket as W3CWebSocket } from "websocket"

export interface IConnection {
  connectionStatus: Observable<any>,
  messages: Observable<any>,
}

export interface IHeaders {}
export interface IRequestOptions {}
export interface IClientConfig {}

export default function connect(
	url: string,
	input: Observable<any>,
	protocols: string[] = null,
	origin?: string,
	headers?: Object,
	requestOptions?: Object,
	clientConfig?: Object): IConnection {
  const connectionStatus = new BehaviorSubject<number>(0)

  const messages = new Observable<any>(observer => {
    const socket = new W3CWebSocket(url, protocols, origin, headers, requestOptions, clientConfig)
    let inputSubscription: Subscription

    let open = false
    const closed = () => {
      if (! open)
        return

      connectionStatus.next(connectionStatus.getValue() - 1)
      open = false
    }

    socket.onopen = () => {
      open = true
      connectionStatus.next(connectionStatus.getValue() + 1)
      inputSubscription = input.subscribe(data => {
        socket.send(JSON.stringify(data))
      })
    }

    socket.onmessage = message => {
      observer.next(JSON.parse(message.data))
    }

    socket.onerror = error => {
      closed()
      observer.error(error)
    }

    socket.onclose = (event: CloseEvent) => {
      closed()
      if (event.wasClean)
        observer.complete()
      else
        observer.error(new Error(event.reason))
    }

    return () => {
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (socket) {
        closed()
        socket.close()
      }
    }
  })

  return { messages, connectionStatus }
}
