/**
 * 日志服务
 */
const fs = wx.getFileSystemManager()
const path = `${wx.env.USER_DATA_PATH}/logs.log`
const IndexKey = 'log_index_list'
const BackList = []

let IndexList = []
let ISLOADING = false
let WaitCount = 0

/**
 * 超过200行就剪切,日志太长的时候就剪切早期的日志
 */
function cutLog300() {
    WaitCount++
    if (WaitCount < 10) return
    WaitCount = 0
    if (IndexList.length < 300) return
    IndexList.length = 200
    const data = IndexList[IndexList.length - 1]
    const res = fs.readFileSync(path, 'utf-8', data.start)
    fs.writeFileSync(path, res, 'utf-8')
    IndexList.forEach((item) => {
        item.start -= data.start
    })
}
/**
 *
 * @param {*} title 标题
 * @param {*} start 开始索引
 * @param {*} len 字节长度
 */
function addToIndex(title, start, len) {
    if (!IndexList) IndexList = []
    IndexList.unshift({
        title,
        start,
        len,
    })
}
/**
 * 保存索引文件
 */
function saveToCache() {
    wx.setStorage({ key: IndexKey, data: IndexList })
}
/**
 * 加入等待队列
 * @param {*} title 标题
 * @param {*} str 字符串
 * @param {*} len 字节数
 */
function addToWait(title, str, len) {
    BackList.push({
        title,
        str,
        len,
    })
}
/**
 * 将等待中的也加入到日志中
 */
function writeWait() {
    if (BackList.length === 0) return
    if (ISLOADING) return
    ISLOADING = true
    const data = BackList.shift()
    fs.getFileInfo({
        filePath: path,
        complete: function (res) {
            addToIndex(data.title, res.size, data.len)
            fs.appendFileSync(path, data.str, 'utf-8')
            // console.log('加入内容长度', res.size, data.len)
            ISLOADING = false
            writeWait()
        },
    })
}

/**
 * 获取字符串的字节数
 * @param {*} str 字符串
 */
function getByteLen(str) {
    var totalLength = 0
    var charCode
    for (var i = 0; i < str.length; i++) {
        charCode = str.charCodeAt(i)
        if (charCode < 0x007f) {
            totalLength++
        } else if (0x0080 <= charCode && charCode <= 0x07ff) {
            totalLength += 2
        } else if (0x0800 <= charCode && charCode <= 0xffff) {
            totalLength += 3
        } else {
            totalLength += 4
        }
    }
    return totalLength
}
/**
 * 测试用方法
 */
function getFileInfo() {
    const list = wx.getStorageSync(IndexKey)
    console.log(path, list, list.length)
    fs.getFileInfo({
        filePath: path,
        complete: function (res) {
            console.log('获取文件信息', res.size, res.digest)
        },
    })
}

/**
 * 初始化日志
 */
export function initLog() {
    //检查是否存在
    ISLOADING = true
    try {
        fs.accessSync(path)
    } catch (error) {
        fs.writeFileSync(path, '', 'utf-8')
    }
    const list = wx.getStorageSync(IndexKey)
    if (!list) {
        wx.setStorageSync(IndexKey, IndexList)
    } else {
        IndexList = list
    }

    ISLOADING = false
}
/**
 * 记录日志
 * @param {*} title 标题
 * @param {*} data 数据
 * @param {*} opts 操作数据
 * @param {*} time 时间，默认当前
 */
export function addLog(title, data, opts, time = Date.now()) {
    const model = {
        title,
        data,
        opts,
        time,
    }
    const str = JSON.stringify(model)
    const len = getByteLen(str)
    if (ISLOADING) {
        addToWait(title, str, len)
        return
    }
    ISLOADING = true
    fs.getFileInfo({
        filePath: path,
        complete: function (res) {
            addToIndex(title, res.size, len)
            fs.appendFileSync(path, str, 'utf-8')
            // console.log('加入内容长度', res.size, len)
            //超过7MB
            // if (res.size > 7000000) {
            //     cutLog()
            // }
            cutLog300()
            ISLOADING = false
            writeWait()
            saveToCache()
        },
    })
}
/**
 * 清空日志
 */
export function clearLog() {
    if (ISLOADING) return
    ISLOADING = true
    IndexList = []
    saveToCache()
    fs.writeFileSync(path, '', 'utf-8')
    ISLOADING = false
}
/**
 *
 * @param {*} pageIndex 开始页数,从0开始
 * @param {*} len 每页条数
 */
export function getLogList(pageIndex, len = 20) {
    const list = wx.getStorageSync(IndexKey)
    const start = pageIndex * len
    const end = start + len
    const data = list.slice(start, end)
    data.forEach((item, index) => {
        item.id = start + index
    })
    return data
}
/**
 * 获取对应日志的详情
 * @param {*} id 序号
 */
export function getLogInfo(id) {
    // getFileInfo()
    const list = wx.getStorageSync(IndexKey)
    const data = list[id]
    if (!data) return null
    const res = fs.readFileSync(path, 'utf-8', data.start, data.len)
    try {
        const model = JSON.parse(res)
        return model
    } catch (error) {
        return null
    }
}
