/**************************************
脚本名称：阿里云盘任务 感谢zqzess、lowking、leiyiyan、mounuo提供的巨大帮助
脚本作者：@Sliverkiss
更新日期：2024-01-24 13:13:56

2024.01.29 
- 修复好运瓶死循环bug
- 移除垃圾回收机制 beta(如更新时发现领取时空间失败，请及时反馈)

------------------------------------------
脚本兼容：Surge、QuantumultX、Loon、Shadowrocket、Node.js
只测试过QuantumultX，其它环境请自行尝试

*************************
【 签到脚本使用教程 】:
*************************
单账号&&多账号：
1.将获取ck脚本拉取到本地
2.打开阿里云盘，若提示获取ck成功，则可以使用该脚本
3.获取成功后，关闭获取ck脚本，避免产生不必要的mitm

QuantumultX配置如下：

[task_local]
0 7,11,17 * * * https://gist.githubusercontent.com/Sliverkiss/33800a98dcd029ba09f8b6fc6f0f5162/raw/aliyun.js, tag=阿里云签到, img-url=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/AliYunDrive.png, enabled=true

[rewrite_local]
^https:\/\/(auth|aliyundrive)\.alipan\.com\/v2\/account\/token url script-request-body https://gist.githubusercontent.com/Sliverkiss/33800a98dcd029ba09f8b6fc6f0f5162/raw/aliyun.js

[MITM]
hostname = auth.alipan.com,auth.aliyundrive.com
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
******************************************/

// env.js 全局
const $ = new Env("☁️阿里云盘签到");
const ckName = "aliyun_data";
//-------------------- 一般不动变量区域 -------------------------------------
const Notify = 1; //0为关闭通知,1为打开通知,默认为1
const notify = $.isNode() ? require("./sendNotify") : "";
let envSplitor = ["@"]; //多账号分隔符
let userCookie = ($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];
let userList = [];
let userIdx = 0;
let userCount = 0;
//调试
$.is_debug =
  ($.isNode() ? process.env.IS_DEDUG : $.getdata("is_debug")) || "false";
//是否自动领取奖励
$.is_reward =
  ($.isNode() ? process.env.IS_DEDUG : $.getdata("aliyun_reward")) || "true";
//垃圾回收期限
$.date = ($.isNode() ? process.env.IS_DEDUG : $.getdata("aliyun_date")) || "";
//垃圾回收区
$.cache = ($.isNode() ? process.env.IS_DEDUG : $.getjson("aliyun_cache")) || {};
// 为通知准备的空数组
$.notifyMsg = [];
// 上传空文件列表
$.uploadFileList = [];
//bark推送
$.barkKey =
  ($.isNode() ? process.env["bark_key"] : $.getdata("bark_key")) || "";
//---------------------- 自定义变量区域 -----------------------------------

//脚本入口函数main()
async function main() {
  await getNotice();
  console.log("\n================== 任务 ==================\n");
  for (let user of userList) {
    console.log(`🔷账号${user.ADrivreInfo.name} >> Start work`);
    console.log(`随机延迟${user.getRandomTime()}ms`);
    //刷新token
    await user.getAuthorizationKey();
    if (user.ckStatus) {
      //签到
      let { signInCount } = await user.signCheckin();
      //垃圾回收
      //await user.FullGC();
      //补签卡任务
      await user.finishCardTask();
      //刷新数据
      await user.getHomeWidgets();
      //随机休眠
      await $.wait(user.getRandomTime());
      //完成时光间备份任务
      await user.finishDeviceRoomTask();
      //领取好运瓶
      await user.bottleTask();
      //随机休眠
      await $.wait(user.getRandomTime());
      //领取签到/备份奖励
      await user.getAllReward(signInCount);
      //刷新垃圾回收区
      await user.removeFiles($.uploadFileList);
      //await user.flashCacheGC();
    } else {
      //将ck过期消息存入消息数组
      $.notifyMsg.push(`❌账号${user.ADrivreInfo.name} >> Check ck error!`);
    }
  }
}

class UserInfo {
  constructor(str) {
    this.index = ++userIdx;
    this.ADrivreInfo = str;
    this.ckStatus = true;
    this.bottleStatus = true;
  }
  getRandomTime() {
    return randomInt(1000, 3000);
  }
  //请求二次封装
  Request(options, method) {
    typeof method === "undefined"
      ? "body" in options
        ? (method = "post")
        : (method = "get")
      : (method = method);
    return new Promise((resolve, reject) => {
      $.http[method.toLowerCase()](options)
        .then((response) => {
          let res = response.body;
          res = $.toObj(res) || res;
          resolve(res);
        })
        .catch((err) => reject(err));
    });
  }
  //垃圾回收机制
  async FullGC() {
    try {
      //获取当前天数
      let isGone = $.date ? diffDate($.date, new Date().getTime()) : 0;
      if (
        Array.isArray($.cache[$.device_id]) &&
        $.cache[$.device_id].length > 0 &&
        isGone > 0
      ) {
        $.log(`⏰ 开始执行垃圾回收任务\n`);
        //批量删除上传空文件
        await this.removeFiles($.cache[$.device_id]);
        $.cache[$.device_id] = [];
        //清空垃圾回收区
        $.setjson($.cache[$.device_id], "aliyun_cache");
      } else {
        isGone > 0
          ? $.log(`♻️垃圾回收区中暂无需要清理的文件 => 跳过垃圾回收任务`)
          : $.log(`♻️未到达垃圾回收期限=> 跳过垃圾回收任务`);
      }
    } catch (e) {
      $.log(`❌垃圾回收失败！原因为:${e}`);
    }
  }
  //刷新垃圾回收区
  async flashCacheGC() {
    try {
      if (Array.isArray($.uploadFileList) && $.uploadFileList.length > 0) {
        if (
          Array.isArray($.cache[$.device_id]) &&
          $.cache[$.device_id].length > 0
        ) {
          //压入垃圾回收区
          $.cache[$.device_id] = [...$.cache[$.device_id], ...$.uploadFileList];
        } else {
          //创建垃圾回收区
          $.cache[$.device_id] = $.uploadFileList;
        }
        //缓存垃圾回收区
        $.setjson($.cache, "aliyun_cache");
        //刷新垃圾回收期限
        $.setjson(new Date().getTime(), "aliyun_date");
        //打印通知
        $.log(`♻️将上传文件缓存到垃圾回收区成功！`);
      } else {
        return $.log(`♻️暂无可回收垃圾`);
      }
    } catch (e) {
      $.log(`❌刷新垃圾回收区失败！原因为:${e}`);
    }
  }
  //一键领取签到/备份奖励
  async getAllReward(signInCount) {
    try {
      //是否开启自动领取奖励
      if ($.is_reward == "false") {
        //判断是否到达月底
        let isLastDay = getGoneDay() == getLastDay();
        console.log(isLastDay);
        $.log(`❌未开启自动领取任务，奖励将会积攒到月底一键清空`);
        $.log(
          `当前日期: ${getGoneDay()} => ` +
            (isLastDay
              ? `已到达 ${getLastDay()} 开始领取奖励！`
              : `未到达 ${getLastDay()} 跳过领取奖励！`)
        );
        //到达月底,一键清空奖励
        if (isLastDay) {
          for (let i = 1; i <= getCountDays(); i++) {
            //签到奖励
            await this.getSignReword(signInCount);
            //备份奖励
            await this.getTaskReword(signInCount);
          }
        }
      } else {
        $.log(`✅已开启自动领取 => 开始领取签到/备份奖励...\n`);
        //签到奖励
        let signMsg = await this.getSignReword(signInCount);
        $.log(`签到: ${signMsg}`);
        //备份奖励
        let backMsg = await this.getTaskReword(signInCount);
        $.log(`备份: ${backMsg}`);
      }
    } catch (e) {
      $.log(`❌一键领取签到/备份奖励失败！原因为:${e}`);
    }
  }
  //获取accessToken
  async getAuthorizationKey() {
    try {
      const options = {
        url: `https://auth.aliyundrive.com/v2/account/token`,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: this.ADrivreInfo.refresh_token,
          grant_type: "refresh_token",
        }),
      };
      //post方法
      let res = await this.Request(options);
      debug(res);
      let { avatar, nick_name, device_id, refresh_token, access_token } = res;
      //缓存用户信息(avatar=>头像，nick_name=>用户名)
      $.avatar = avatar;
      $.nick_name = nick_name;
      $.device_id = device_id;
      //获取accessKey鉴权
      let accessKey = "Bearer " + access_token;
      debug(accessKey, "鉴权");
      this.authorization = accessKey;
      let index = userCookie.findIndex(
        (e) => e.name == nick_name && e.device_id == device_id
      );
      userCookie[index].refresh_token = refresh_token;
      //刷新token
      if ($.setjson(userCookie, ckName)) {
        $.log(`${nick_name}刷新阿里网盘refresh_token成功 🎉`);
      } else {
        DoubleLog(`${nick_name}刷新阿里网盘refresh_token失败‼️`, "", "");
        this.ckStatus = false;
      }
      //accessKey
      return accessKey;
    } catch (e) {
      $.log(`❌获取accessToken失败！原因为:${e}`);
    }
  }
  //查询签到日历
  async signCheckin() {
    console.log(`⏰ 开始执行签到任务\n`);
    try {
      const options = {
        url: "https://member.aliyundrive.com/v2/activity/sign_in_list",
        headers: {
          "Content-Type": "application/json",
          authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let { message, result } = await this.Request(options);
      //
      if (message) {
        DoubleLog(`❌签到失败!${message}`);
        return;
      }
      let { isSignIn, isReward, signInCount, signInInfos } = result;
      //获取今天签到信息
      let signInRes = signInInfos.find(
        (e) => Number(e.day) == Number(signInCount)
      );
      let { subtitle, rewards } = signInRes;
      debug(rewards, "签到信息");
      //打印
      if (rewards.length > 0) {
        $.log(`签到天数:${signInCount}=> ${subtitle}`);
        DoubleLog(`用户名: ${$.nick_name} => 第${signInCount}天`);
        DoubleLog(
          `自动领取: ${
            $.is_reward == "false"
              ? "未开启 => 月底一键清空"
              : "已开启 => 每日自动领取"
          }`
        );
        //今日奖励详情
        $.signReward = rewards[0].name;
        $.backUpReward = rewards[1].name;
        $.log(
          `\n查询签到日历 => 第${signInCount}天可领取奖励如下:\n签到奖励: ${$.signReward}\n备份奖励: ${$.backUpReward}\n`
        );
        $.log(`执行签到任务 => 已完成✅\n`);
      }
      //今日是否已签到
      $.signMsg =
        (isSignIn ? `🎉${$.nick_name}签到成功!` : `️⚠️今天已经签到过了`) || "";
      //打印通知
      DoubleLog(`签到: ${$.signReward}`);
      return { signInCount };
    } catch (e) {
      $.log(`❌查询签到日历失败！原因为:${e}`);
    }
  }
  //获取签到信息
  async getSignInfo() {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v2/activity/sign_in_info`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          "x-device-id": this.ADrivreInfo.device_id,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let res = await this.Request(options);
      debug(res, "获取签到信息");
    } catch (e) {
      $.log(`❌获取签到信息失败！原因为:${e}`);
    }
  }
  //刷新阿里云主界面数据
  async getHomeWidgets() {
    try {
      const options = {
        url: `https://api.alipan.com/apps/v2/users/home/widgets`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          "x-device-id": this.ADrivreInfo.device_id,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let res = await this.Request(options);
      $.log(`刷新阿里云界面信息`);
      debug(res, "获取home信息");
    } catch (e) {
      $.log(`❌获取home信息失败！原因为:${e}`);
    }
  }
  // 领取签到奖励
  async getSignReword(signInCount) {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v1/activity/sign_in_reward`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({ signInDay: signInCount }),
      };
      //post方法
      let { result, message } = await this.Request(options);
      //打印领取详情
      $.log(
        `领取第${signInCount}天签到奖励 => 🎉${
          result.description || result.name
        }领取成功!`
      );
      return result.description ? result.description : result.name;
    } catch (e) {
      $.log(`❌领取签到奖励失败！原因为:${e}`);
    }
  }
  //领取备份奖励
  async getTaskReword(signInCount) {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v2/activity/sign_in_task_reward?_rx-s=mobile`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({ signInDay: signInCount }),
      };
      //post方法
      let { result, message } = await this.Request(options);
      //打印领取详情
      $.log(
        result && !message
          ? `领取备份奖励 => 🎉${result.description}领取成功!`
          : `领取备份奖励 => ❌${message}`
      );
      return result && !message ? result.description : message;
    } catch (e) {
      $.log(`❌领取备份奖励失败！原因为:${e}`);
    }
  }
  //备份设备列表
  async getDeviceList() {
    try {
      const options = {
        url: `https://api.alipan.com/adrive/v2/backup/device_applet_list_summary`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          "x-device-id": this.ADrivreInfo.device_id,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let { deviceItems } = (await this.Request(options)) ?? [];
      $.log(
        Array.isArray(deviceItems) && deviceItems.length > 0
          ? `✅ 成功获取到 ${deviceItems.length} 台设备\n`
          : `❌ 获取设备列表失败: 你账号下没有设备\n`
      );
      debug(deviceItems, "备份设备列表");
      return deviceItems;
    } catch (e) {
      $.log(`❌查询备份设备列表失败！原因为:${e}`);
    }
  }

  // 上传文件到相册/完成照片备份任务
  async uploadFileToAlbums(
    albumsId,
    deviceId = this.ADrivreInfo.device_id,
    deviceModel = "iPhone 13"
  ) {
    try {
      //获取相册信息
      //    this.albumsId = await this.getAlbumsInfo();
      //创建上传文件
      let res = await this.createFile(albumsId, deviceId, deviceModel);
      if (res?.file_id && res?.upload_id && res?.upload_url) {
        let { file_id, upload_id, upload_url } = res;
        //开始上传文件
        await this.toUploadFile(upload_url, deviceId);
        //完成上传文件
        await this.completeUpload(this.albumsId, deviceId, file_id, upload_id);
        //返回创建文件id
        return file_id;
      }
      return false;
    } catch (e) {
      $.log(`❌上传文件到相册/完成照片备份任务失败！原因为:${e}`);
    }
  }
  //完成快传任务
  async finishQuickShare() {
    try {
      this.albumsId = await this.getAlbumsInfo();
      let file_id = await this.getAlbumsList();
      //若文件id不存在，跳过快传任务
      if (!file_id) {
        $.log(`容量不足,跳过快传任务`);
        return false;
      }
      const options = {
        url: `https://api.aliyundrive.com/adrive/v1/share/create`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({
          drive_file_list: [
            {
              drive_id: this.albumsId,
              file_id,
            },
          ],
        }),
      };
      let res = await this.Request(options);
      debug(res, "完成快传任务");
      return true;
    } catch (e) {
      $.log(`❌完成快传任务失败！原因为:${e}`);
    }
  }
  //获取相册文件列表
  async getAlbumsList() {
    try {
      this.albumsId = await this.getAlbumsInfo();
      const options = {
        url: `https://api.alipan.com/adrive/v2/backup/device/file_list`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({
          deviceType: "iOS",
          deviceId: this.ADrivreInfo.device_id,
          driveId: this.albumsId,
          backupView: "album",
          parentFileId: "root",
          limit: 1,
        }),
      };
      let res = await this.Request(options);
      //判断相册列表是否存在文件
      if (res?.items?.[0]?.file_id) {
        return res?.items?.[0]?.file_id;
      } else {
        return await this.uploadFileToAlbums(this.albumsId);
      }
    } catch (e) {
      $.log(`❌获取相册文件列表失败！原因为:${e}`);
    }
  }
  //获取相册信息
  async getAlbumsInfo() {
    try {
      const options = {
        url: `https://api.aliyundrive.com/adrive/v1/user/albums_info`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      let { data } = await this.Request(options);
      return data?.driveId;
    } catch (e) {
      $.log(`❌获取相册信息失败！原因为:${e}`);
    }
  }
  //创建上传文件
  async createFile(albumsId, deviceId, deviceModel) {
    try {
      const options = {
        url: `https://api.aliyundrive.com/adrive/v1/biz/albums/file/create`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          "x-device-id": deviceId,
        },
        body: JSON.stringify({
          drive_id: albumsId,
          part_info_list: [
            {
              part_number: 1,
            },
          ],
          parent_file_id: "root",
          name: Math.floor(Math.random() * 100000000) + ".jpg",
          type: "file",
          check_name_mode: "auto_rename",
          size: Math.floor(Math.random() * 30000),
          create_scene: "auto_autobackup",
          device_name: deviceModel,
          hidden: false,
          content_type: "image/jpeg",
        }),
      };
      let { file_id, upload_id, part_info_list } = await this.Request(options);
      //判断相册空间是否充足
      if (part_info_list?.length > 0) {
        let upload_url = part_info_list[0]?.upload_url;
        return { file_id, upload_id, upload_url };
      }
      //空间不足，创建文件失败
      return $.log(`相册空间容量不足,跳过上传备份文件`);
    } catch (e) {
      $.log(`❌创建上传文件失败！原因为:${e}`);
    }
  }
  //开始上传文件
  async toUploadFile(upload_url, deviceId) {
    try {
      const options = {
        url: upload_url,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
          Origin: "https://www.aliyundrive.com",
          Referer: "https://www.aliyundrive.com",
          deviceId: deviceId,
        },
        body: JSON.stringify({}),
      };
      let res = await this.Request(options);
      debug(res);
    } catch (e) {
      $.log(`❌开始上传文件失败！原因为:${e}`);
    }
  }
  //完成上传文件
  async completeUpload(albumsId, deviceId, file_id, upload_id) {
    try {
      const options = {
        url: `https://api.aliyundrive.com/v2/file/complete`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
          deviceId: deviceId,
        },
        body: JSON.stringify({
          drive_id: albumsId,
          upload_id: upload_id,
          file_id: file_id,
        }),
      };
      let res = await this.Request(options);
      debug(res);
      $.uploadFileList.push(file_id);
    } catch (e) {
      $.log(`❌完成上传文件失败！原因为:${e}`);
    }
  }
  //批量清空上传空文件
  async removeFiles(uploadFileList) {
    $.log(`开始批量清除上传空文件...`);
    let albumId = await this.getAlbumsInfo();
    for (let item of uploadFileList) {
      await this.removeFile(albumId, item);
    }
  }
  //删除上传文件
  async removeFile(albumsId, file_id) {
    try {
      const options = {
        url: `https://api.alipan.com/adrive/v4/batch`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({
          requests: [
            {
              body: {
                drive_id: albumsId,
                file_id: file_id,
              },
              id: file_id,
              method: "POST",
              url: "/file/delete",
            },
          ],
          resource: "file",
        }),
      };
      let res = await this.Request(options);
      debug(res);
    } catch (e) {
      $.log(`❌删除上传文件失败！原因为:${e}`);
    }
  }
  //完成时光间备份任务
  async finishDeviceRoomTask() {
    try {
      //获取相册信息
      this.albumsId = await this.getAlbumsInfo();
      //获取设备列表
      let deviceList = await this.getDeviceList();
      //获取时空间可领取奖励列表
      let items = await this.getListDevice();
      //debug(deviceList);
      $.log(`⏰ 开始执行时光设备间备份任务\n`);
      let { rewardCountToday, rewardTotalSize } =
        await this.getDeviceRoomInfo();
      if (rewardCountToday >= 5) {
        DoubleLog(
          `时光间: 总共领取${rewardTotalSize}MB,今日领取次数：${rewardCountToday}`
        );
        return $.log(`今日时光间领取奖励已达到上限，跳过任务\n`);
      }
      for (let e of deviceList) {
        if (items) {
          let deviceItem = items.find((u) => u.id == e.deviceId) ?? [];
          //若设备无可领取奖励，执行上传任务
          if (!deviceItem.canCollectEnergy) {
            //每个设备上传两次空文件
            for (let i = 1; i <= 2; i++) {
              await this.uploadFileToAlbums(
                this.albumsId,
                e.deviceId,
                e.deviceModel
              );
              $.log(`${e.deviceModel} 完成第${i}次上传任务`);
            }
          }
          //随机休眠
          await $.wait(this.getRandomTime());
          //领取时光间奖励
          await this.getEnergyReword(e);
        } else {
          $.log(`❌获取时空间设备列表失败！`);
        }
      }
      let res = await this.getDeviceRoomInfo();
      DoubleLog(
        `时光间: 总共领取${res.rewardTotalSize}MB,今日领取次数：${res.rewardCountToday}`
      );
    } catch (e) {
      $.log(`❌完成时光间备份任务失败！原因为:${e}`);
    }
  }
  //获取时光间信息
  async getDeviceRoomInfo() {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v1/deviceRoom/rewardInfoToday`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let { result, message } = await this.Request(options);
      return {
        rewardTotalSize: result?.rewardTotalSize,
        rewardCountToday: result?.rewardCountToday,
      };
    } catch (e) {
      $.log(`❌获取时光间信息失败！原因为:${e}`);
    }
  }
  //获取时空间可领取奖励设备列表
  async getListDevice() {
    try {
      const options = {
        url: `https://user.aliyundrive.com/v1/deviceRoom/listDevice`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      //post方法
      let { items } = (await this.Request(options)) ?? [];
      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
      return false;
    } catch (e) {
      $.log(`❌查询是空间奖励列表失败！原因为:${e}`);
    }
  }
  //领取时光间奖励
  async getEnergyReword(e) {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v1/deviceRoom/rewardEnergy`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({
          deviceId: e.deviceId,
        }),
      };
      //post方法
      let { result, message } = await this.Request(options);
      $.log(
        `${e.deviceModel}:` +
          (result && !message
            ? `领取${result?.size}MB成功!`
            : `今日已领取或暂无备份奖励`) +
          "\n"
      );
    } catch (e) {
      $.log(`❌领取时光间奖励失败！原因为:${e}`);
    }
  }
  //执行好运瓶任务
  async bottleTask() {
    $.log(`⏰ 开始执行好运瓶任务\n`);
    let index = 1;
    do {
      await this.bottleFish();
    } while (this.bottleStatus && index++ <= 5);
  }
  //领取好运瓶
  async bottleFish() {
    try {
      const options = {
        url: `https://api.aliyundrive.com/adrive/v1/bottle/fish`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      //{"bottleId":1726268665825546200,"bottleName":"你的名字","shareId":"EG9LdVtcxdw"}
      //{"code":"TooManyRequests","message":"TooManyRequests","requestId":"0a0070d417055857275284776ea12f","display_message":"今天接瓶子次数已用完，明天再来~"}
      let { bottleName, display_message } = await this.Request(options);
      if (display_message) {
        DoubleLog(`好运瓶: ${display_message}`);
        this.bottleStatus = false;
      } else {
        $.log(`好运瓶[${bottleName}]领取成功！\n`);
      }
    } catch (e) {
      $.log(`❌领取好运瓶失败！原因为:${e}`);
      this.bottleStatus = false;
    }
  }
  //完成补签卡任务
  async finishCardTask() {
    try {
      console.log(`⏰ 开始执行补签卡任务\n`);
      //翻牌子
      for (let i = 1; i <= 3; i++) {
        await this.flipCard(i);
      }
      //获取任务详情
      const cardDetail = await this.getCardTaskDetail();
      let { period, tasks } = cardDetail;
      //过滤已完成任务
      tasks = tasks.filter((e) => e.status == "unfinished");
      debug(tasks, "未完成任务列表");
      if (!tasks) {
        $.log(`✅补签卡所有任务已完成`);
      } else {
        for (let task of tasks) {
          switch (task.taskName) {
            case "当周使用好运瓶翻3次":
              console.log(`⏰ 开始执行任务: ${task.taskName}`);
              if (task.status != "finished") {
                await this.bottleTask();
              }
              console.log(`✅ 成功完成任务: ${task.taskName}`);
              break;
            case "当周使用快传发送文件给好友":
              console.log(`⏰ 开始执行任务: ${task.taskName}`);
              if (task.status != "finished") {
                $.quickShareStatus = await this.finishQuickShare();
              }
              console.log(
                $.quickShareStatus
                  ? `✅ 成功完成任务: ${task.taskName}`
                  : `❌容量不足，完成快传任务失败`
              );
              break;
            case "当周备份照片满20张":
              console.log(`⏰ 开始执行任务: ${task.taskName}`);
              if (task.status != "finished") {
                this.albumsId = await this.getAlbumsInfo();
                for (let i = 0; i < 20; i++) {
                  $.uploadStatus = await this.uploadFileToAlbums(this.albumsId);
                  //相册空间容量不足，跳过任务
                  if (!$.uploadStatus) break;
                }
              }
              //存在文件id
              console.log(
                $.uploadStatus
                  ? `✅ 成功完成任务: ${task.taskName}`
                  : `❌容量不足，完成备份照片任务失败`
              );
              break;
            default:
              console.log(`❌ 不支持当前任务: ${task.taskName}`);
              break;
          }
        }
      }
      //领取补签卡奖励
      await this.receiveCard();
    } catch (e) {
      $.log(`❌完成补签卡任务失败！原因为:${e}`);
    }
  }
  //翻转补签卡任务牌
  async flipCard(position) {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v2/activity/complement_task?_rx-s=mobile`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({ position }),
      };
      let res = await this.Request(options);
      debug(res, "翻转补签卡任务牌");
    } catch (e) {
      $.log(`❌翻转补签卡任务牌失败！原因为:${e}`);
    }
  }
  //获取补签卡任务详情
  async getCardTaskDetail() {
    try {
      const options = {
        url: `https://member.aliyundrive.com/v2/activity/complement_task_detail?_rx-s=mobile`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({}),
      };
      let res = await this.Request(options);
      debug(res, "获取补签卡任务详情");
      return res?.result;
    } catch (e) {
      $.log(`❌获取补签卡任务详情失败！原因为:${e}`);
    }
  }
  //领取补签卡
  async receiveCard() {
    try {
      const { period, tasks } = await this.getCardTaskDetail();
      //查询完成任务编号
      let task = tasks.find((e) => e.status == "finished");
      //不存在完成任务，跳过领取
      if (!task) return $.log(`未完成补签卡任务，领取奖励失败`);
      const options = {
        url: `https://member.aliyundrive.com/v2/activity/complement_task_reward?_rx-s=mobile`,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authorization,
        },
        body: JSON.stringify({
          period,
          taskId: task?.taskId,
        }),
      };
      let res = await this.Request(options);
      debug(res, "领取补签卡任务奖励");
      DoubleLog(`补签卡: ` + (res.message || "任务已完成，成功领取1张补签卡"));
      // return res?.result;
    } catch (e) {
      $.log(`❌领取补签卡失败！原因为:${e}`);
    }
  }
}

//获取Cookie
async function getCookie() {
  if ($request && $request.method != "OPTIONS") {
    try {
      const body = JSON.parse($request.body);
      let refresh_token = body.refresh_token;
      //不存在token时
      if (!refresh_token) {
        return $.msg($.name, "", "❌获取token失败！请稍后再试～");
      }
      //获取响应体
      let { nick_name, avatar, device_id } =
        (await getRespBody(refresh_token)) ?? {};
      //是否存在多账号数据
      if (Array.isArray(userCookie) && userCookie.length == 0) {
        userCookie.push({
          name: nick_name,
          refresh_token: refresh_token,
          device_id: device_id,
        });
        $.setjson(userCookie, ckName);
        $.msg($.name, `🎉${nick_name}获取token成功!`, "", {
          "media-url": avatar,
        });
      } else {
        userCookie = eval("(" + userCookie + ")");
        let index = userCookie.findIndex(
          (e) => e.name == nick_name && e.device_id == device_id
        );
        if (userCookie[index]) {
          userCookie[index].refresh_token = refresh_token;
          $.setjson(userCookie, ckName);
          $.msg($.name, `🎉${nick_name}更新token成功!`, "", {
            "media-url": avatar,
          });
        } else {
          userCookie.push({
            name: nick_name,
            refresh_token: refresh_token,
            device_id: device_id,
          });
          $.setjson(userCookie, ckName);
          $.msg($.name, `🎉${nick_name}获取token成功!`, ``, {
            "media-url": avatar,
          });
        }
      }
    } catch (e) {
      $.msg(
        $.name,
        "❌获取阿里云盘refresh_token失败！请检查boxjs格式是否正确",
        e
      );
    }
  }
}

async function getRespBody(refresh_token) {
  //获取用户名作为标识键
  const options = {
    url: `https://auth.aliyundrive.com/v2/account/token`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  };
  return new Promise((resolve) => {
    $.post(options, async (error, response, data) => {
      try {
        let result = JSON.parse(data);
        resolve(result);
      } catch (error) {
        $.log(error);
        resolve();
      }
    });
  });
}

async function getNotice() {
  try {
    const urls = [
      "https://cdn.jsdelivr.net/gh/Sliverkiss/GoodNight@main/notice.json",
      "https://cdn.jsdelivr.net/gh/Sliverkiss/GoodNight@main/tip.json",
    ];
    for (const url of urls) {
      const options = {
        url,
        headers: {
          "User-Agent": "",
        },
      };
      const result = await httpRequest(options);
      if (result) console.log(result.notice);
    }
  } catch (e) {
    console.log(e);
  }
}

//主程序执行入口
!(async () => {
  //没有设置变量,执行Cookie获取
  if (typeof $request != "undefined") {
    await getCookie();
    return;
  }
  //未检测到ck，退出
  if (!(await checkEnv())) {
    throw new Error(`❌未检测到ck，请添加环境变量`);
  }
  if (userList.length > 0) {
    await main();
  }
})()
  .catch((e) => $.notifyMsg.push(e.message || e)) //捕获登录函数等抛出的异常, 并把原因添加到全局变量(通知)
  .finally(async () => {
    if ($.barkKey) {
      //如果已填写Bark Key
      await BarkNotify($, $.barkKey, $.name, $.notifyMsg.join("\n")); //推送Bark通知
    }
    await SendMsg($.notifyMsg.join("\n")); //带上总结推送通知
    $.done(); //调用Surge、QX内部特有的函数, 用于退出脚本执行
  });

/** --------------------------------辅助函数区域------------------------------------------- */

// 当天
function getGoneDay(n = 0, yearFlag = true) {
  let myDate = new Date();
  myDate.setDate(myDate.getDate() - n);
  let month = myDate.getMonth() + 1;
  let day = myDate.getDate();
  let result =
    "" +
    (yearFlag ? myDate.getFullYear() : "") +
    "/" +
    month +
    "/" +
    (day < 10 ? "0" + day : day);
  return result;
}

//计算天数差
function diffDate(date1, date2) {
  let day = Math.floor(Math.abs(date1 - date2) / 1000 / 60 / 60 / 24 + 0.5);
  return day;
}

// 月底最后一天
function getLastDay() {
  let nowDate = new Date();
  nowDate.setMonth(nowDate.getMonth() + 1);
  nowDate.setDate(0);
  let lastMonthDay = nowDate.toLocaleDateString();
  return lastMonthDay;
}

// 当月有几天
function getCountDays() {
  var curDate = new Date();
  var curMonth = curDate.getMonth();
  curDate.setMonth(curMonth + 1);
  curDate.setDate(0);
  return curDate.getDate();
}

// 双平台log输出
function DoubleLog(data) {
  if ($.isNode()) {
    if (data) {
      console.log(`${data}`);
      $.notifyMsg.push(`${data}`);
    }
  } else {
    console.log(`${data}`);
    $.notifyMsg.push(`${data}`);
  }
}

// DEBUG
function debug(text, title = "debug") {
  if ($.is_debug === "true") {
    if (typeof text == "string") {
      console.log(`\n-----------${title}------------\n`);
      console.log(text);
      console.log(`\n-----------${title}------------\n`);
    } else if (typeof text == "object") {
      console.log(`\n-----------${title}------------\n`);
      console.log($.toStr(text));
      console.log(`\n-----------${title}------------\n`);
    }
  }
}

//检查变量
async function checkEnv() {
  if (Array.isArray(userCookie) && userCookie.length == 0) {
    console.log("未找到CK");
    return;
  } else {
    userCookie = eval("(" + userCookie + ")");
    for (let n of userCookie) n && userList.push(new UserInfo(n));
    userCount = userList.length;
  }
  return console.log(`共找到${userCount}个账号`), true; //true == !0
}

/**
 * 随机整数生成
 */
function randomInt(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}
// 发送消息
async function SendMsg(message) {
  if (!message) return;
  if (Notify > 0) {
    if ($.isNode()) {
      await notify.sendNotify($.name, message);
    } else {
      $.msg($.name, $.signMsg, message, { "media-url": $.avatar });
    }
  } else {
    console.log(message);
  }
}
