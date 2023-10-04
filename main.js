/**
* Heavily inspired on github.com/google/python-temescal
* Works for daily usage on LG-SL9YG
* This will keep the connection always on to prevent any delay.
*/

const net = require('net');
const crypto = require('crypto');

class LGSoundbar {
    constructor(ip) {
        this.cipherType = 'aes-256-cbc';
        this.iv = '\'%^Ur7gy$~t+f)%@';
        this.key = 'T^&*J%^7tr~4^%^&I(o%^!jIJ__+a0 k';
        this.address = ip;
        this.port = 9741;
        this.socket = null;

        this.isConnected = false;
        this.lastResponse = null;

        this.connect();
    }

    connect() {
        this.socket = new net.Socket();

        this.socket.connect(this.port, this.address, () => {
            console.log('Connection started.');

            this.isConnected = true;
            this.listen();
        });
    }

    listen() {
        this.socket.on('data', async (data) => {
            if (data[0] !== 0x10) {
                return;
            }

            const encryptedData = data.slice(5);

            if (encryptedData.length % 16 !== 0) {
                return;
            }

            const response = this.decryptPacket(encryptedData);

            if (response !== null) {
                this.lastResponse = JSON.parse(response);
            }
        });

        this.socket.on('error', (error) => {
            console.log('Error detected:', error);

            this.isConnected = false;

            this.connect();
        });

        this.socket.on('close', () => {
            console.log('Socket closed.');

            this.isConnected = false;

            this.connect();
        });
    }

    waitForResponse() {
        // This method is called whenever we run write on the socket.
        // We are basically listening for socket data just after we write to the socket.
        // This does not necessarily mean that received data from the socket belongs to the latest write.
        // Sometimes there will be no response at all. Such as if you set volume to 20 but it is already 20.
        // This can be also problematic when you do two writes at the same time.

        let count = 0;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.lastResponse) {
                    clearInterval(interval);

                    resolve(this.lastResponse);
                }

                count = count + 1;

                if (count >= 100) {
                    resolve('No response received from socket.');
                }
            }, 10);
        });
    };

    encryptPacket(data) {
        const encrypter = crypto.createCipheriv(this.cipherType, this.key, this.iv);

        return encrypter.update(data, 'utf8', 'binary') + encrypter.final('binary');
    }

    decryptPacket(data) {
        const decrypter = crypto.createDecipheriv(this.cipherType, this.key, this.iv);
        const decrypted = decrypter.update(data, 'binary') + decrypter.final('binary');

        return decrypted.toString('utf8');
    }

    isPoweredOn() {
        return this.isConnected;
    }

    createPacket(data) {
        let output = data;

        if (typeof(output) !== 'string') {
            output = JSON.stringify(output);
        }

        const encryptedPayload = Buffer.from(this.encryptPacket(output), 'binary');
        const header = Buffer.from([0x10, 0x00, 0x00, 0x00, encryptedPayload.length]);
        const payload = [header, encryptedPayload];

        return Buffer.concat(payload);
    };

    async sendPacket(payload) {
        return new Promise((resolve, reject) => {
            this.socket.write(this.createPacket(payload), async (error) => {
                if (error) {
                    resolve(error);
                }

                const lastResponse = await this.waitForResponse();

                resolve(lastResponse);

                this.lastResponse = null;
            });
        });
    }

    async setRawInput(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_curr_func': value}, 'msg': 'FUNC_VIEW_INFO'});
    }

    async getInput() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'FUNC_VIEW_INFO'});
    }

    async getInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'SPK_LIST_VIEW_INFO'});
    }

    async setVolume(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_vol': value}, 'msg': 'SPK_LIST_VIEW_INFO'});
    }

    async getEq() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'EQ_VIEW_INFO'});
    }

    async setEq(eq) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_curr_eq': eq}, 'msg': 'EQ_VIEW_INFO'});
    }

    async getPlay() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'PLAY_INFO'});
    }

    async getSettings() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'SETTING_VIEW_INFO'});
    }

    async getProductInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'PRODUCT_INFO'});
    }

    async getC4aInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'C4A_SETTING_INFO'});
    }

    async getRadioInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'RADIO_VIEW_INFO'});
    }

    async getApInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'SHARE_AP_INFO'});
    }

    async getUpdateInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'UPDATE_VIEW_INFO'});
    }

    async getBuildInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'BUILD_INFO_DEV'});
    }

    async getOptionInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'OPTION_INFO_DEV'});
    }

    async getMacInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'MAC_INFO_DEV'});
    }

    async getMemMonInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'MEM_MON_DEV'});
    }

    async getTestInfo() {
        return await this.sendPacket({'cmd': 'get', 'msg': 'TEST_DEV'});
    }

    async testTone() {
        return await this.sendPacket({'cmd': 'set', 'msg': 'TEST_TONE_REQ'});
    }

    async setNightMode(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_night_mode': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setAvc(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_auto_vol': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setDrc(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_drc': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setNeuralX(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_neuralx': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setAvSync(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_av_sync': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setWooferLevel(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_woofer_level': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setRearControl(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_rear': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setRearLevel(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_rear_level': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setTopLevel(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_top_level': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setCenterLevel(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_center_level': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setTvRemote(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_tv_remote': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setAutoPower(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_auto_power': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setAutoDisplay(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_auto_display': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setBtStandby(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_bt_standby': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setBtRestrict(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_conn_bt_limit': enable}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setSleepTime(value) {
        return await this.sendPacket({'cmd': 'set', 'data': {'i_sleep_time': value}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setMute(enable) {
        return await this.sendPacket({'cmd': 'set', 'data': {'b_mute': enable}, 'msg': 'SPK_LIST_VIEW_INFO'});
    }

    async setName(name) {
        return await this.sendPacket({'cmd': 'set', 'data': {'s_user_name': name}, 'msg': 'SETTING_VIEW_INFO'});
    }

    async setFactory() {
        return await this.sendPacket({'cmd': 'set', 'msg': 'FACTORY_SET_REQ'});
    }
}

module.exports = LGSoundbar;
