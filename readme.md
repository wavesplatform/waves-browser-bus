# Browser Bus     
[en](https://github.com/wavesplatform/waves-browser-bus/blob/master/README.md) | ru

Библиотека для работы над текстовым протоколом.
Позволяет реализовать связь например для:
 * двух различных окон браузера
 * окно браузера с iframe

## Browser Bus API

В библиотеке содержится классы Bus, Adapter и WindowAdapter, кроме того есть конфигурирование 
уровня логирования.
Для работы библиотеки должны быть 2 
стороны между которыми можно отправлять сообщения любого формата.
С каждой из этих сторон нужно создать по экземпляру класса Bus для отправки и получения
запросов и событий.

## Bus

Позволяет отправлять и подписываться на события. 

Принимает экземпляр класса Adapter отвечающий за реализацию протокола отправки сообщений 
и время ожидания ответа по умолчанию (в миллисекундах).
Время ответа не обязательный параметр и по умолчанию равен 5 секунд.

Пример связи iframe и родительского окна:

На стороне родительского окна:
```javascript
    import { Bus, WindowAdapter } from '@waves/waves-browser-bus';

    const url = 'https://some-iframe-content-url.com';
    const iframe = document.createElement('iframe');
    
    WindowAdapter.createSimpleWindowAdapter(iframe).then(adapter => {
        const bus = new Bus(adapter);
        
        bus.once('ready', () => {
            // Получено сообщение от iframe 
        });
    });
    iframe.src = url; // Предпочтительно присваивать url после вызова WindowAdapter.createSimpleWindowAdapter
    document.body.appendChild(iframe);
```
На стороне iframe:
```javascript
    import { Bus, WindowAdapter } from '@waves/waves-browser-bus';
    WindowAdapter.createSimpleWindowAdapter().then(adapter => {
        const bus = new Bus(adapter);
        
        bus.dispatchEvent('ready', null); // Отправили сообщение в родительское окно
    });
    
```

### dispatchEvent

Отправляет событие. Все экземпляры Bus, с которыми установлена связь и есть подписка на это событие, получат это сообщение.
Вторым аргументом передаются данные для обработчиков. 
Везде, кроме IE, допустимы объекты, которые клонируются, а в IE – только строка. 

```javascript

bus.dispatchEvent('some-event-name', jsonLikeData);

```

### request

Параметры:
+ name - метод запроса котоый вызовится на другом экземпляре Bus
+ [data] - данные которые будут переданы в метод
+ [timeout] - время ожидания ответа (default = 5000)

Если за время `timeout` ответа не последует - будет сгенерирована ошибка по таймауту.
Если другой экземпляр Bus не имеет обработчика с именем `name` будет сгенерирована ошибка 
(см. `registerRequestHandler`)
Если во время выполнения метода произойдёт ошибка - она вернётся в Promise.reject.

Отправляет запрос к другому экземпляру Bus.

```javascript

bus.request('some-event-name', jsonLikeData, 100).then(data => {
    // data - ответ от Bus 
});

```

### on
Позволяет подписаться на события из Bus.  

Пример:
```javascript
   bus.on('some-event', data => {
        //data - данные пришедшие в событии  
   });
```


### once
Позволяет однократно подписаться на события из Bus.  

Пример:
```javascript
   bus.once('some-event', data => {
        //data - данные пришедшие в событии  
   });
```

### off
Позволяет отписаться от событий другого Bus.

Параметры:
+ [eventName] - имя события. Если не передано отпишется от всех событий с переданным `handler`.  
+ [handler] - обработчик событий. Если не передан - отпишется от всех обработчиков с данным `eventName`.

Если параметры не переданы - отпишется от всех событий.

Пример:
```javascript
   bus.off('some-event', handler); // Отпишется от `some-event` с обработчиком `handler`
   bus.off('some-event'); // Отпишется от всех обработчиков на имя `some-event`
   bus.off(null, handler); // Отпишется во всех именах от обработчика `handler`
   bus.off(); // Отпишется от всех событий
```



### registerRequestHandler
Метод для обработки запроса из другого экземпляра bus.

Параметры:
+ name - имя метода который будет доступен для вызова из другого bus
+ handler - обработчик который будет отвечать в другой bus
Если обработчик возвращает `Promise`, то bus дождется окончания и отправит результат.

Пример:
```javascript
    // В коде c одним из bus (например в iframe)
    bus.registerRequestHandler('get-random', () => Math.random());
    
    // В основном коде приложения
    bus.request('get-random').then(num => {
        // Получили ответ из окна в iframe
    })

    
```

или

```javascript
    // В коде c одним из bus (например в iframe)
    bus.registerRequestHandler('get-random', () => Promise.resolve(Math.random()));
    
    // В основном коде приложения
    bus.request('get-random').then(num => {
        // Получили ответ из окна в iframe
    })

    
```

