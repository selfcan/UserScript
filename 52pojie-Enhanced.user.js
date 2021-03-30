// ==UserScript==
// @name         吾爱破解论坛增强 - 自动签到、翻页
// @version      1.2.4
// @author       X.I.U
// @description  自动签到、自动无缝翻页（全站）、屏蔽导读悬赏贴（最新发表）
// @match        *://www.52pojie.cn/*
// @icon         https://www.52pojie.cn/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @license      GPL-3.0 License
// @run-at       document-end
// @namespace    https://greasyfork.org/scripts/412680
// ==/UserScript==

(function() {
    var menu_ALL = [
        ['menu_thread_pageLoading', '帖子内自动翻页', '帖子内自动翻页', true],
        ['menu_delateReward', '屏蔽导读悬赏贴（最新发表）', '屏蔽导读悬赏贴', true]
    ], menu_ID = [];
    for (let i=0;i<menu_ALL.length;i++){ // 如果读取到的值为 null 就写入默认值
        if (GM_getValue(menu_ALL[i][0]) == null){GM_setValue(menu_ALL[i][0], menu_ALL[i][3])};
    }
    registerMenuCommand();

    // 注册脚本菜单
    function registerMenuCommand() {
        if (menu_ID.length > menu_ALL.length){ // 如果菜单ID数组多于菜单数组，说明不是首次添加菜单，需要卸载所有脚本菜单
            for (let i=0;i<menu_ID.length;i++){
                GM_unregisterMenuCommand(menu_ID[i]);
            }
        }
        for (let i=0;i<menu_ALL.length;i++){ // 循环注册脚本菜单
            menu_ALL[i][3] = GM_getValue(menu_ALL[i][0]);
            menu_ID[i] = GM_registerMenuCommand(`[ ${menu_ALL[i][3]?'√':'×'} ] ${menu_ALL[i][1]}`, function(){menu_switch(`${menu_ALL[i][3]}`,`${menu_ALL[i][0]}`,`${menu_ALL[i][2]}`)});
        }
        menu_ID[menu_ID.length] = GM_registerMenuCommand('反馈 & 建议', function () {window.GM_openInTab('https://github.com/XIU2/UserScript#xiu2userscript', {active: true,insert: true,setParent: true});});
    }

    // 菜单开关
    function menu_switch(menu_status, Name, Tips) {
        if (menu_status == 'true'){
            GM_setValue(`${Name}`, false);
            GM_notification({text: `已关闭 [${Tips}] 功能\n（刷新网页后生效）`, title: '吾爱破解论坛增强', timeout: 3000});
        }else{
            GM_setValue(`${Name}`, true);
            GM_notification({text: `已开启 [${Tips}] 功能\n（刷新网页后生效）`, title: '吾爱破解论坛增强', timeout: 3000});
        }
        registerMenuCommand(); // 重新注册脚本菜单
    };

    // 返回菜单值
    function menu_value(menuName) {
        for (let menu of menu_ALL) {
            if (menu[0] == menuName) {
                return menu[3]
            }
        }
    }

    var ShowPager;
    showPager();
    // 默认 ID 为 0
    var curSite = {SiteTypeID: 0};

    // 自动翻页规则，scrollDelta 数值越大，滚动条触发点越靠上
    let DBSite = {
        forum: {
            SiteTypeID: 1,
            pager: {
                scrollDelta: 766
            }
        },
        thread: {
            SiteTypeID: 2,
            pager: {
                nextLink: '//div[@id="pgt"]//a[contains(text(),"下一页")][@href]',
                pageElement: 'css;div#postlist > div[id^="post_"]',
                HT_insert: ['css;div#postlist', 2],
                replaceE: 'css;div.pg',
                scrollDelta: 766
            }
        },
        guide: {
            SiteTypeID: 3,
            pager: {
                nextLink: '//div[@id="pgt"]//a[contains(text(),"下一页")][@href]',
                pageElement: 'css;div#threadlist div.bm_c table > tbody[id^="normalthread_"]',
                HT_insert: ['css;div#threadlist div.bm_c table', 2],
                replaceE: 'css;div.pg',
                scrollDelta: 766
            }
        },
        collection: {
            SiteTypeID: 4,
            pager: {
                nextLink: '//div[@class="pg"]//a[contains(text(),"下一页")][@href]',
                pageElement: 'css;div#ct div.bm_c table > tbody',
                HT_insert: ['css;div#ct div.bm_c table', 2],
                replaceE: 'css;div.pg',
                scrollDelta: 899
            }
        },
        search: {
            SiteTypeID: 5,
            pager: {
                nextLink: '//a[@class="nxt"][@href]',
                pageElement: 'css;div#threadlist > ul',
                HT_insert: ['css;div#threadlist', 2],
                replaceE: 'css;div.pg',
                scrollDelta: 766
            }
        }
    };

    // 用于脚本内部判断当前 URL 类型
    let SiteType = {
        FORUM: DBSite.forum.SiteTypeID, //           各板块帖子列表
        THREAD: DBSite.thread.SiteTypeID, //         帖子内
        GUIDE: DBSite.guide.SiteTypeID, //           导读帖子列表
        COLLECTION: DBSite.collection.SiteTypeID, // 淘贴列表
        SEARCH: DBSite.search.SiteTypeID //          搜索结果列表
    };

    // URL 匹配正则表达式
    let patt_thread = /\/thread-\d+-\d+\-\d+.html/,
        patt_thread_2 = /mod\=viewthread/,
        patt_forum = /\/forum-\d+-\d+\.html/,
        patt_forum_2 = /mod\=forumdisplay/,
        patt_guide = /mod\=guide\&view\=(hot|digest|new|newthread|my|tech|help)/,
        patt_guide_newthread = /mod\=guide\&view\=newthread/,
        patt_collection = /mod\=collection/

    // URL 判断
    if (patt_thread.test(location.pathname) || patt_thread_2.test(location.search)){
        if(menu_value('menu_thread_pageLoading')) {
            curSite = DBSite.thread; //      帖子内
            hidePgbtn(); //                  隐藏帖子内的 [下一页] 按钮
        }
    }else if (patt_forum.test(location.pathname) || patt_forum_2.test(location.search)){
        curSite = DBSite.forum; //           各板块帖子列表
    }else if (patt_guide.test(location.search)){
        curSite = DBSite.guide; //           导读帖子列表
        delateReward(); //                   屏蔽导读悬赏贴（最新发表）
    }else if (patt_collection.test(location.search)){
        curSite = DBSite.collection; //      淘贴列表
    }else if(location.pathname === '/search.php'){
        curSite = DBSite.search; //          搜索结果列表
    }else if(location.href === "https://www.52pojie.cn/home.php?mod=task&do=draw&id=2"){
        window.opener=null;window.open('','_self');window.close(); // 关闭当前网页标签页
    }
    curSite.pageUrl = ""; // 下一页URL

    qianDao(); // 看看有没有签到
    pageLoading(); // 自动翻页


    // 自动翻页
    function pageLoading() {
        if (curSite.SiteTypeID > 0){
            windowScroll(function (direction, e) {
                if (direction === "down") { // 下滑才准备翻页
                    let scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
                    let scrollDelta = curSite.pager.scrollDelta;
                    if (document.documentElement.scrollHeight <= document.documentElement.clientHeight + scrollTop + scrollDelta) {
                        if (curSite.SiteTypeID === SiteType.FORUM) { // 如果是原创、精品等版块则直接点下一页就行了
                            let autopbn = document.querySelector('#autopbn');
                            if (autopbn && autopbn.innerText == "下一页 »"){ // 如果没有在加载时，再去点击，免得一不注意加载几十页
                                autopbn.click();
                            }
                        }else{
                            ShowPager.loadMorePage();
                        }
                    }
                }
            });
        }
    }


    // 自动签到
    function qianDao() {
        let qiandao = document.querySelector('#um p:last-child a:first-child');
        if (qiandao && qiandao.href === "https://www.52pojie.cn/home.php?mod=task&do=apply&id=2"){
            window.GM_openInTab(qiandao.href, {active: false,insert: true,setParent: true}) // 后台打开签到地址
            qiandao.querySelector('.qq_bind').setAttribute('src','https://www.52pojie.cn/static/image/common/wbs.png') // 修改 [打卡签到] 图标为 [签到完毕]
            qiandao.href = "#" // 修改 URL 为 #
        }
    }


    //屏蔽悬赏贴（导读-最新发表）
    function delateReward(){
        if(patt_guide_newthread.test(location.search) && menu_value('menu_delateReward')){
            let table = document.querySelector("#threadlist > div.bm_c > table"),
                tbodys = table.getElementsByTagName('tbody'),
                arrs = [];
            for (let i=0; i<tbodys.length; i++){
                var by_td = tbodys[i].childNodes[1].children[2].children[0].attributes[0].value;
                if(by_td=="forum-8-1.html"){
                    arrs.push(tbodys[i]);
                }
            }
            for (let i=0; i<arrs.length; i++){
                arrs[i].parentNode.removeChild(arrs[i]);
            }
        }
        if(document.body.scrollHeight < window.innerHeight) {
            // 如果屏蔽悬赏贴后，剩余帖子列表太少会没有滚动条，无法滚动页面触发自动翻页事件，需要手动触发
            ShowPager.loadMorePage();
        }
    }


    // 隐藏帖子内的 [下一页] 按钮
    function hidePgbtn(){
        let style_hidePgbtn = document.createElement('style');
        style_hidePgbtn.innerHTML = `.pgbtn {display: none;}`;
        document.head.appendChild(style_hidePgbtn);
    }


    // 滚动条事件
    function windowScroll(fn1) {
        var beforeScrollTop = document.documentElement.scrollTop,
            fn = fn1 || function () {};
        setTimeout(function () { // 延时执行，避免刚载入到页面就触发翻页事件
            window.addEventListener("scroll", function (e) {
                var afterScrollTop = document.documentElement.scrollTop,
                    delta = afterScrollTop - beforeScrollTop;
                if (delta == 0) return false;
                fn(delta > 0 ? "down" : "up", e);
                beforeScrollTop = afterScrollTop;
            }, false);
        }, 1000)
    }


    // 自动无缝翻页，修改自 https://greasyfork.org/scripts/14178
    function showPager() {
        ShowPager = {
            getFullHref: function (e) {
                if(e == null) return '';
                "string" != typeof e && (e = e.getAttribute("href"));
                var t = this.getFullHref.a;
                return t || (this.getFullHref.a = t = document.createElement("a")), t.href = e, t.href;
            },
            createDocumentByString: function (e) {
                if (e) {
                    if ("HTML" !== document.documentElement.nodeName) return (new DOMParser).parseFromString(e, "application/xhtml+xml");
                    var t;
                    try {
                        t = (new DOMParser).parseFromString(e, "text/html");
                    } catch (e) {
                    }
                    if (t) return t;
                    if (document.implementation.createHTMLDocument) t = document.implementation.createHTMLDocument("ADocument"); else try {
                        (t = document.cloneNode(!1)).appendChild(t.importNode(document.documentElement, !1)),
                            t.documentElement.appendChild(t.createElement("head")), t.documentElement.appendChild(t.createElement("body"));
                    } catch (e) {
                    }
                    if (t) {
                        var r = document.createRange();
                        r.selectNodeContents(document.body);
                        var n = r.createContextualFragment(e);
                        t.body.appendChild(n);
                        for (var a, o = {
                            TITLE: !0,
                            META: !0,
                            LINK: !0,
                            STYLE: !0,
                            BASE: !0
                        }, i = t.body, s = i.childNodes, c = s.length - 1; c >= 0; c--) o[(a = s[c]).nodeName] && i.removeChild(a);
                        return t;
                    }
                } else console.error("没有找到要转成DOM的字符串");
            },
            loadMorePage: function () {
                if (curSite.pager) {
                    let curPageEle = getElementByXpath(curSite.pager.nextLink);
                    var url = this.getFullHref(curPageEle);
                    //console.log(`${url} ${curPageEle} ${curSite.pageUrl}`);
                    if(url === '') return;
                    if(curSite.pageUrl === url) return;// 不会重复加载相同的页面
                    curSite.pageUrl = url;
                    // 读取下一页的数据
                    curSite.pager.startFilter && curSite.pager.startFilter();
                    GM_xmlhttpRequest({
                        url: url,
                        method: "GET",
                        timeout: 5000,
                        onload: function (response) {
                            try {
                                var newBody = ShowPager.createDocumentByString(response.responseText);
                                let pageElems = getAllElements(curSite.pager.pageElement, newBody, newBody);
                                let toElement = getAllElements(curSite.pager.HT_insert[0])[0];
                                if (pageElems.length >= 0) {
                                    let addTo = "beforeend";
                                    if (curSite.pager.HT_insert[1] == 1) addTo = "beforebegin";
                                    // 插入新页面元素
                                    pageElems.forEach(function (one) {
                                        toElement.insertAdjacentElement(addTo, one);
                                    });
                                    //删除悬赏贴
                                    delateReward();
                                    // 替换待替换元素
                                    try {
                                        let oriE = getAllElements(curSite.pager.replaceE);
                                        let repE = getAllElements(curSite.pager.replaceE, newBody, newBody);
                                        if (oriE.length === repE.length) {
                                            for (var i = 0; i < oriE.length; i++) {
                                                oriE[i].outerHTML = repE[i].outerHTML;
                                            }
                                        }
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    });
                }
            },
        };
    }


    function getElementByXpath(e, t, r) {
      r = r || document, t = t || r;
      try {
        return r.evaluate(e, t, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      } catch (t) {
        return void console.error("无效的xpath");
      }
    }


    function getAllElements(e, t, r, n, o) {
      let getAllElementsByXpath = function(e, t, r) {
        return r = r || document, t = t || r, r.evaluate(e, t, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      }

      var i, s = [];
      if (!e) return s;
      if (r = r || document, n = n || window, o = o || void 0, t = t || r, "string" == typeof e) i = 0 === e.search(/^css;/i) ? function getAllElementsByCSS(e, t) {
        return (t || document).querySelectorAll(e);
      }(e.slice(4), t) : getAllElementsByXpath(e, t, r); else {
        if (!(i = e(r, n, o))) return s;
        if (i.nodeType) return s[0] = i, s;
      }
      return function makeArray(e) {
        var t, r, n, o = [];
        if (e.pop) {
          for (t = 0, r = e.length; t < r; t++) (n = e[t]) && (n.nodeType ? o.push(n) : o = o.concat(makeArray(n)));
          return a()(o);
        }
        if (e.item) {
          for (t = e.length; t;) o[--t] = e[t];
          return o;
        }
        if (e.iterateNext) {
          for (t = e.snapshotLength; t;) o[--t] = e.snapshotItem(t);
          return o;
        }
      }(i);
    }
})();