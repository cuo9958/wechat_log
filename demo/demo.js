// page
import { addLog, getLogList, clearLog, getLogInfo } from "../index";

Page({
    data: {},
    onLoad: async function () {},
    onShow: async function () {},
    appendString() {
        const str = "测试内容" + Math.random();
        addLog(str, { test: 1 });
    },
    readStr() {
        const list = getLogList(0);
        console.log("读取结果", list);
    },
    get1() {
        const data = getLogInfo(1);
        console.log("读取一个", data);
    },
    clearStr() {
        clearLog();
    },
});
