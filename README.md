# lgsoundbar
NodeJS library to interact with LG soundbars.
Heavily inspired from [python-temescal](https://github.com/google/python-temescal) project.


Works without problem on SL9YG on daily usage. But since the original python-temescal project supports wide range of LG soundbars, this one should support them too.


## example usage

```
const LGSoundbar = require('main.js');

(async () => {
    const soundbar = new LGSoundbar(SOUNDBAR_IP);

    console.log(await soundbar.getBuildInfo());
})();
```

## notes

The responses of the methods are not always accurate and sometimes do not exist at all.

Whenever we run a command, a write is being made to the socket. And whenever socket decides to return data we save it as lastResponse.

To catch the response of the write, we are just listening for new data just after the write for 100 miliseconds. So when you call two methods simultaneously you will probably get unexpected response.

Sometimes for example, when you set volume to 20 and if its already 20 you will receive no data at all from the socket.