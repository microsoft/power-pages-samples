(function(){const c=document.createElement("link").relList;if(c&&c.supports&&c.supports("modulepreload"))return;for(const m of document.querySelectorAll('link[rel="modulepreload"]'))u(m);new MutationObserver(m=>{for(const h of m)if(h.type==="childList")for(const g of h.addedNodes)g.tagName==="LINK"&&g.rel==="modulepreload"&&u(g)}).observe(document,{childList:!0,subtree:!0});function f(m){const h={};return m.integrity&&(h.integrity=m.integrity),m.referrerPolicy&&(h.referrerPolicy=m.referrerPolicy),m.crossOrigin==="use-credentials"?h.credentials="include":m.crossOrigin==="anonymous"?h.credentials="omit":h.credentials="same-origin",h}function u(m){if(m.ep)return;m.ep=!0;const h=f(m);fetch(m.href,h)}})();var Zs={exports:{}},Gn={};/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Nm;function Gg(){if(Nm)return Gn;Nm=1;var r=Symbol.for("react.transitional.element"),c=Symbol.for("react.fragment");function f(u,m,h){var g=null;if(h!==void 0&&(g=""+h),m.key!==void 0&&(g=""+m.key),"key"in m){h={};for(var w in m)w!=="key"&&(h[w]=m[w])}else h=m;return m=h.ref,{$$typeof:r,type:u,key:g,ref:m!==void 0?m:null,props:h}}return Gn.Fragment=c,Gn.jsx=f,Gn.jsxs=f,Gn}var Tm;function Xg(){return Tm||(Tm=1,Zs.exports=Gg()),Zs.exports}var o=Xg(),Ks={exports:{}},re={};/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var zm;function Vg(){if(zm)return re;zm=1;var r=Symbol.for("react.transitional.element"),c=Symbol.for("react.portal"),f=Symbol.for("react.fragment"),u=Symbol.for("react.strict_mode"),m=Symbol.for("react.profiler"),h=Symbol.for("react.consumer"),g=Symbol.for("react.context"),w=Symbol.for("react.forward_ref"),y=Symbol.for("react.suspense"),p=Symbol.for("react.memo"),z=Symbol.for("react.lazy"),E=Symbol.for("react.activity"),D=Symbol.iterator;function Y(S){return S===null||typeof S!="object"?null:(S=D&&S[D]||S["@@iterator"],typeof S=="function"?S:null)}var q={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},k=Object.assign,H={};function U(S,B,Q){this.props=S,this.context=B,this.refs=H,this.updater=Q||q}U.prototype.isReactComponent={},U.prototype.setState=function(S,B){if(typeof S!="object"&&typeof S!="function"&&S!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,S,B,"setState")},U.prototype.forceUpdate=function(S){this.updater.enqueueForceUpdate(this,S,"forceUpdate")};function J(){}J.prototype=U.prototype;function L(S,B,Q){this.props=S,this.context=B,this.refs=H,this.updater=Q||q}var F=L.prototype=new J;F.constructor=L,k(F,U.prototype),F.isPureReactComponent=!0;var K=Array.isArray;function ee(){}var G={H:null,A:null,T:null,S:null},oe=Object.prototype.hasOwnProperty;function W(S,B,Q){var I=Q.ref;return{$$typeof:r,type:S,key:B,ref:I!==void 0?I:null,props:Q}}function V(S,B){return W(S.type,B,S.props)}function Z(S){return typeof S=="object"&&S!==null&&S.$$typeof===r}function ae(S){var B={"=":"=0",":":"=2"};return"$"+S.replace(/[=:]/g,function(Q){return B[Q]})}var ie=/\/+/g;function he(S,B){return typeof S=="object"&&S!==null&&S.key!=null?ae(""+S.key):B.toString(36)}function ye(S){switch(S.status){case"fulfilled":return S.value;case"rejected":throw S.reason;default:switch(typeof S.status=="string"?S.then(ee,ee):(S.status="pending",S.then(function(B){S.status==="pending"&&(S.status="fulfilled",S.value=B)},function(B){S.status==="pending"&&(S.status="rejected",S.reason=B)})),S.status){case"fulfilled":return S.value;case"rejected":throw S.reason}}throw S}function R(S,B,Q,I,se){var fe=typeof S;(fe==="undefined"||fe==="boolean")&&(S=null);var Ee=!1;if(S===null)Ee=!0;else switch(fe){case"bigint":case"string":case"number":Ee=!0;break;case"object":switch(S.$$typeof){case r:case c:Ee=!0;break;case z:return Ee=S._init,R(Ee(S._payload),B,Q,I,se)}}if(Ee)return se=se(S),Ee=I===""?"."+he(S,0):I,K(se)?(Q="",Ee!=null&&(Q=Ee.replace(ie,"$&/")+"/"),R(se,B,Q,"",function(Jl){return Jl})):se!=null&&(Z(se)&&(se=V(se,Q+(se.key==null||S&&S.key===se.key?"":(""+se.key).replace(ie,"$&/")+"/")+Ee)),B.push(se)),1;Ee=0;var tt=I===""?".":I+":";if(K(S))for(var He=0;He<S.length;He++)I=S[He],fe=tt+he(I,He),Ee+=R(I,B,Q,fe,se);else if(He=Y(S),typeof He=="function")for(S=He.call(S),He=0;!(I=S.next()).done;)I=I.value,fe=tt+he(I,He++),Ee+=R(I,B,Q,fe,se);else if(fe==="object"){if(typeof S.then=="function")return R(ye(S),B,Q,I,se);throw B=String(S),Error("Objects are not valid as a React child (found: "+(B==="[object Object]"?"object with keys {"+Object.keys(S).join(", ")+"}":B)+"). If you meant to render a collection of children, use an array instead.")}return Ee}function X(S,B,Q){if(S==null)return S;var I=[],se=0;return R(S,I,"","",function(fe){return B.call(Q,fe,se++)}),I}function ne(S){if(S._status===-1){var B=S._result;B=B(),B.then(function(Q){(S._status===0||S._status===-1)&&(S._status=1,S._result=Q)},function(Q){(S._status===0||S._status===-1)&&(S._status=2,S._result=Q)}),S._status===-1&&(S._status=0,S._result=B)}if(S._status===1)return S._result.default;throw S._result}var Te=typeof reportError=="function"?reportError:function(S){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var B=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof S=="object"&&S!==null&&typeof S.message=="string"?String(S.message):String(S),error:S});if(!window.dispatchEvent(B))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",S);return}console.error(S)},_e={map:X,forEach:function(S,B,Q){X(S,function(){B.apply(this,arguments)},Q)},count:function(S){var B=0;return X(S,function(){B++}),B},toArray:function(S){return X(S,function(B){return B})||[]},only:function(S){if(!Z(S))throw Error("React.Children.only expected to receive a single React element child.");return S}};return re.Activity=E,re.Children=_e,re.Component=U,re.Fragment=f,re.Profiler=m,re.PureComponent=L,re.StrictMode=u,re.Suspense=y,re.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=G,re.__COMPILER_RUNTIME={__proto__:null,c:function(S){return G.H.useMemoCache(S)}},re.cache=function(S){return function(){return S.apply(null,arguments)}},re.cacheSignal=function(){return null},re.cloneElement=function(S,B,Q){if(S==null)throw Error("The argument must be a React element, but you passed "+S+".");var I=k({},S.props),se=S.key;if(B!=null)for(fe in B.key!==void 0&&(se=""+B.key),B)!oe.call(B,fe)||fe==="key"||fe==="__self"||fe==="__source"||fe==="ref"&&B.ref===void 0||(I[fe]=B[fe]);var fe=arguments.length-2;if(fe===1)I.children=Q;else if(1<fe){for(var Ee=Array(fe),tt=0;tt<fe;tt++)Ee[tt]=arguments[tt+2];I.children=Ee}return W(S.type,se,I)},re.createContext=function(S){return S={$$typeof:g,_currentValue:S,_currentValue2:S,_threadCount:0,Provider:null,Consumer:null},S.Provider=S,S.Consumer={$$typeof:h,_context:S},S},re.createElement=function(S,B,Q){var I,se={},fe=null;if(B!=null)for(I in B.key!==void 0&&(fe=""+B.key),B)oe.call(B,I)&&I!=="key"&&I!=="__self"&&I!=="__source"&&(se[I]=B[I]);var Ee=arguments.length-2;if(Ee===1)se.children=Q;else if(1<Ee){for(var tt=Array(Ee),He=0;He<Ee;He++)tt[He]=arguments[He+2];se.children=tt}if(S&&S.defaultProps)for(I in Ee=S.defaultProps,Ee)se[I]===void 0&&(se[I]=Ee[I]);return W(S,fe,se)},re.createRef=function(){return{current:null}},re.forwardRef=function(S){return{$$typeof:w,render:S}},re.isValidElement=Z,re.lazy=function(S){return{$$typeof:z,_payload:{_status:-1,_result:S},_init:ne}},re.memo=function(S,B){return{$$typeof:p,type:S,compare:B===void 0?null:B}},re.startTransition=function(S){var B=G.T,Q={};G.T=Q;try{var I=S(),se=G.S;se!==null&&se(Q,I),typeof I=="object"&&I!==null&&typeof I.then=="function"&&I.then(ee,Te)}catch(fe){Te(fe)}finally{B!==null&&Q.types!==null&&(B.types=Q.types),G.T=B}},re.unstable_useCacheRefresh=function(){return G.H.useCacheRefresh()},re.use=function(S){return G.H.use(S)},re.useActionState=function(S,B,Q){return G.H.useActionState(S,B,Q)},re.useCallback=function(S,B){return G.H.useCallback(S,B)},re.useContext=function(S){return G.H.useContext(S)},re.useDebugValue=function(){},re.useDeferredValue=function(S,B){return G.H.useDeferredValue(S,B)},re.useEffect=function(S,B){return G.H.useEffect(S,B)},re.useEffectEvent=function(S){return G.H.useEffectEvent(S)},re.useId=function(){return G.H.useId()},re.useImperativeHandle=function(S,B,Q){return G.H.useImperativeHandle(S,B,Q)},re.useInsertionEffect=function(S,B){return G.H.useInsertionEffect(S,B)},re.useLayoutEffect=function(S,B){return G.H.useLayoutEffect(S,B)},re.useMemo=function(S,B){return G.H.useMemo(S,B)},re.useOptimistic=function(S,B){return G.H.useOptimistic(S,B)},re.useReducer=function(S,B,Q){return G.H.useReducer(S,B,Q)},re.useRef=function(S){return G.H.useRef(S)},re.useState=function(S){return G.H.useState(S)},re.useSyncExternalStore=function(S,B,Q){return G.H.useSyncExternalStore(S,B,Q)},re.useTransition=function(){return G.H.useTransition()},re.version="19.2.6",re}var Am;function hu(){return Am||(Am=1,Ks.exports=Vg()),Ks.exports}var x=hu(),Js={exports:{}},Xn={},$s={exports:{}},Fs={};/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Cm;function Qg(){return Cm||(Cm=1,(function(r){function c(R,X){var ne=R.length;R.push(X);e:for(;0<ne;){var Te=ne-1>>>1,_e=R[Te];if(0<m(_e,X))R[Te]=X,R[ne]=_e,ne=Te;else break e}}function f(R){return R.length===0?null:R[0]}function u(R){if(R.length===0)return null;var X=R[0],ne=R.pop();if(ne!==X){R[0]=ne;e:for(var Te=0,_e=R.length,S=_e>>>1;Te<S;){var B=2*(Te+1)-1,Q=R[B],I=B+1,se=R[I];if(0>m(Q,ne))I<_e&&0>m(se,Q)?(R[Te]=se,R[I]=ne,Te=I):(R[Te]=Q,R[B]=ne,Te=B);else if(I<_e&&0>m(se,ne))R[Te]=se,R[I]=ne,Te=I;else break e}}return X}function m(R,X){var ne=R.sortIndex-X.sortIndex;return ne!==0?ne:R.id-X.id}if(r.unstable_now=void 0,typeof performance=="object"&&typeof performance.now=="function"){var h=performance;r.unstable_now=function(){return h.now()}}else{var g=Date,w=g.now();r.unstable_now=function(){return g.now()-w}}var y=[],p=[],z=1,E=null,D=3,Y=!1,q=!1,k=!1,H=!1,U=typeof setTimeout=="function"?setTimeout:null,J=typeof clearTimeout=="function"?clearTimeout:null,L=typeof setImmediate<"u"?setImmediate:null;function F(R){for(var X=f(p);X!==null;){if(X.callback===null)u(p);else if(X.startTime<=R)u(p),X.sortIndex=X.expirationTime,c(y,X);else break;X=f(p)}}function K(R){if(k=!1,F(R),!q)if(f(y)!==null)q=!0,ee||(ee=!0,ae());else{var X=f(p);X!==null&&ye(K,X.startTime-R)}}var ee=!1,G=-1,oe=5,W=-1;function V(){return H?!0:!(r.unstable_now()-W<oe)}function Z(){if(H=!1,ee){var R=r.unstable_now();W=R;var X=!0;try{e:{q=!1,k&&(k=!1,J(G),G=-1),Y=!0;var ne=D;try{t:{for(F(R),E=f(y);E!==null&&!(E.expirationTime>R&&V());){var Te=E.callback;if(typeof Te=="function"){E.callback=null,D=E.priorityLevel;var _e=Te(E.expirationTime<=R);if(R=r.unstable_now(),typeof _e=="function"){E.callback=_e,F(R),X=!0;break t}E===f(y)&&u(y),F(R)}else u(y);E=f(y)}if(E!==null)X=!0;else{var S=f(p);S!==null&&ye(K,S.startTime-R),X=!1}}break e}finally{E=null,D=ne,Y=!1}X=void 0}}finally{X?ae():ee=!1}}}var ae;if(typeof L=="function")ae=function(){L(Z)};else if(typeof MessageChannel<"u"){var ie=new MessageChannel,he=ie.port2;ie.port1.onmessage=Z,ae=function(){he.postMessage(null)}}else ae=function(){U(Z,0)};function ye(R,X){G=U(function(){R(r.unstable_now())},X)}r.unstable_IdlePriority=5,r.unstable_ImmediatePriority=1,r.unstable_LowPriority=4,r.unstable_NormalPriority=3,r.unstable_Profiling=null,r.unstable_UserBlockingPriority=2,r.unstable_cancelCallback=function(R){R.callback=null},r.unstable_forceFrameRate=function(R){0>R||125<R?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):oe=0<R?Math.floor(1e3/R):5},r.unstable_getCurrentPriorityLevel=function(){return D},r.unstable_next=function(R){switch(D){case 1:case 2:case 3:var X=3;break;default:X=D}var ne=D;D=X;try{return R()}finally{D=ne}},r.unstable_requestPaint=function(){H=!0},r.unstable_runWithPriority=function(R,X){switch(R){case 1:case 2:case 3:case 4:case 5:break;default:R=3}var ne=D;D=R;try{return X()}finally{D=ne}},r.unstable_scheduleCallback=function(R,X,ne){var Te=r.unstable_now();switch(typeof ne=="object"&&ne!==null?(ne=ne.delay,ne=typeof ne=="number"&&0<ne?Te+ne:Te):ne=Te,R){case 1:var _e=-1;break;case 2:_e=250;break;case 5:_e=1073741823;break;case 4:_e=1e4;break;default:_e=5e3}return _e=ne+_e,R={id:z++,callback:X,priorityLevel:R,startTime:ne,expirationTime:_e,sortIndex:-1},ne>Te?(R.sortIndex=ne,c(p,R),f(y)===null&&R===f(p)&&(k?(J(G),G=-1):k=!0,ye(K,ne-Te))):(R.sortIndex=_e,c(y,R),q||Y||(q=!0,ee||(ee=!0,ae()))),R},r.unstable_shouldYield=V,r.unstable_wrapCallback=function(R){var X=D;return function(){var ne=D;D=X;try{return R.apply(this,arguments)}finally{D=ne}}}})(Fs)),Fs}var _m;function Zg(){return _m||(_m=1,$s.exports=Qg()),$s.exports}var Ws={exports:{}},et={};/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Rm;function Kg(){if(Rm)return et;Rm=1;var r=hu();function c(y){var p="https://react.dev/errors/"+y;if(1<arguments.length){p+="?args[]="+encodeURIComponent(arguments[1]);for(var z=2;z<arguments.length;z++)p+="&args[]="+encodeURIComponent(arguments[z])}return"Minified React error #"+y+"; visit "+p+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function f(){}var u={d:{f,r:function(){throw Error(c(522))},D:f,C:f,L:f,m:f,X:f,S:f,M:f},p:0,findDOMNode:null},m=Symbol.for("react.portal");function h(y,p,z){var E=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:m,key:E==null?null:""+E,children:y,containerInfo:p,implementation:z}}var g=r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function w(y,p){if(y==="font")return"";if(typeof p=="string")return p==="use-credentials"?p:""}return et.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=u,et.createPortal=function(y,p){var z=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!p||p.nodeType!==1&&p.nodeType!==9&&p.nodeType!==11)throw Error(c(299));return h(y,p,null,z)},et.flushSync=function(y){var p=g.T,z=u.p;try{if(g.T=null,u.p=2,y)return y()}finally{g.T=p,u.p=z,u.d.f()}},et.preconnect=function(y,p){typeof y=="string"&&(p?(p=p.crossOrigin,p=typeof p=="string"?p==="use-credentials"?p:"":void 0):p=null,u.d.C(y,p))},et.prefetchDNS=function(y){typeof y=="string"&&u.d.D(y)},et.preinit=function(y,p){if(typeof y=="string"&&p&&typeof p.as=="string"){var z=p.as,E=w(z,p.crossOrigin),D=typeof p.integrity=="string"?p.integrity:void 0,Y=typeof p.fetchPriority=="string"?p.fetchPriority:void 0;z==="style"?u.d.S(y,typeof p.precedence=="string"?p.precedence:void 0,{crossOrigin:E,integrity:D,fetchPriority:Y}):z==="script"&&u.d.X(y,{crossOrigin:E,integrity:D,fetchPriority:Y,nonce:typeof p.nonce=="string"?p.nonce:void 0})}},et.preinitModule=function(y,p){if(typeof y=="string")if(typeof p=="object"&&p!==null){if(p.as==null||p.as==="script"){var z=w(p.as,p.crossOrigin);u.d.M(y,{crossOrigin:z,integrity:typeof p.integrity=="string"?p.integrity:void 0,nonce:typeof p.nonce=="string"?p.nonce:void 0})}}else p==null&&u.d.M(y)},et.preload=function(y,p){if(typeof y=="string"&&typeof p=="object"&&p!==null&&typeof p.as=="string"){var z=p.as,E=w(z,p.crossOrigin);u.d.L(y,z,{crossOrigin:E,integrity:typeof p.integrity=="string"?p.integrity:void 0,nonce:typeof p.nonce=="string"?p.nonce:void 0,type:typeof p.type=="string"?p.type:void 0,fetchPriority:typeof p.fetchPriority=="string"?p.fetchPriority:void 0,referrerPolicy:typeof p.referrerPolicy=="string"?p.referrerPolicy:void 0,imageSrcSet:typeof p.imageSrcSet=="string"?p.imageSrcSet:void 0,imageSizes:typeof p.imageSizes=="string"?p.imageSizes:void 0,media:typeof p.media=="string"?p.media:void 0})}},et.preloadModule=function(y,p){if(typeof y=="string")if(p){var z=w(p.as,p.crossOrigin);u.d.m(y,{as:typeof p.as=="string"&&p.as!=="script"?p.as:void 0,crossOrigin:z,integrity:typeof p.integrity=="string"?p.integrity:void 0})}else u.d.m(y)},et.requestFormReset=function(y){u.d.r(y)},et.unstable_batchedUpdates=function(y,p){return y(p)},et.useFormState=function(y,p,z){return g.H.useFormState(y,p,z)},et.useFormStatus=function(){return g.H.useHostTransitionStatus()},et.version="19.2.6",et}var Om;function Jg(){if(Om)return Ws.exports;Om=1;function r(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r)}catch(c){console.error(c)}}return r(),Ws.exports=Kg(),Ws.exports}/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Mm;function $g(){if(Mm)return Xn;Mm=1;var r=Zg(),c=hu(),f=Jg();function u(e){var t="https://react.dev/errors/"+e;if(1<arguments.length){t+="?args[]="+encodeURIComponent(arguments[1]);for(var a=2;a<arguments.length;a++)t+="&args[]="+encodeURIComponent(arguments[a])}return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function m(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function h(e){var t=e,a=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(a=t.return),e=t.return;while(e)}return t.tag===3?a:null}function g(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function w(e){if(e.tag===31){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function y(e){if(h(e)!==e)throw Error(u(188))}function p(e){var t=e.alternate;if(!t){if(t=h(e),t===null)throw Error(u(188));return t!==e?null:e}for(var a=e,l=t;;){var n=a.return;if(n===null)break;var i=n.alternate;if(i===null){if(l=n.return,l!==null){a=l;continue}break}if(n.child===i.child){for(i=n.child;i;){if(i===a)return y(n),e;if(i===l)return y(n),t;i=i.sibling}throw Error(u(188))}if(a.return!==l.return)a=n,l=i;else{for(var s=!1,d=n.child;d;){if(d===a){s=!0,a=n,l=i;break}if(d===l){s=!0,l=n,a=i;break}d=d.sibling}if(!s){for(d=i.child;d;){if(d===a){s=!0,a=i,l=n;break}if(d===l){s=!0,l=i,a=n;break}d=d.sibling}if(!s)throw Error(u(189))}}if(a.alternate!==l)throw Error(u(190))}if(a.tag!==3)throw Error(u(188));return a.stateNode.current===a?e:t}function z(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e;for(e=e.child;e!==null;){if(t=z(e),t!==null)return t;e=e.sibling}return null}var E=Object.assign,D=Symbol.for("react.element"),Y=Symbol.for("react.transitional.element"),q=Symbol.for("react.portal"),k=Symbol.for("react.fragment"),H=Symbol.for("react.strict_mode"),U=Symbol.for("react.profiler"),J=Symbol.for("react.consumer"),L=Symbol.for("react.context"),F=Symbol.for("react.forward_ref"),K=Symbol.for("react.suspense"),ee=Symbol.for("react.suspense_list"),G=Symbol.for("react.memo"),oe=Symbol.for("react.lazy"),W=Symbol.for("react.activity"),V=Symbol.for("react.memo_cache_sentinel"),Z=Symbol.iterator;function ae(e){return e===null||typeof e!="object"?null:(e=Z&&e[Z]||e["@@iterator"],typeof e=="function"?e:null)}var ie=Symbol.for("react.client.reference");function he(e){if(e==null)return null;if(typeof e=="function")return e.$$typeof===ie?null:e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case k:return"Fragment";case U:return"Profiler";case H:return"StrictMode";case K:return"Suspense";case ee:return"SuspenseList";case W:return"Activity"}if(typeof e=="object")switch(e.$$typeof){case q:return"Portal";case L:return e.displayName||"Context";case J:return(e._context.displayName||"Context")+".Consumer";case F:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case G:return t=e.displayName||null,t!==null?t:he(e.type)||"Memo";case oe:t=e._payload,e=e._init;try{return he(e(t))}catch{}}return null}var ye=Array.isArray,R=c.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,X=f.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,ne={pending:!1,data:null,method:null,action:null},Te=[],_e=-1;function S(e){return{current:e}}function B(e){0>_e||(e.current=Te[_e],Te[_e]=null,_e--)}function Q(e,t){_e++,Te[_e]=e.current,e.current=t}var I=S(null),se=S(null),fe=S(null),Ee=S(null);function tt(e,t){switch(Q(fe,t),Q(se,e),Q(I,null),t.nodeType){case 9:case 11:e=(e=t.documentElement)&&(e=e.namespaceURI)?Jd(e):0;break;default:if(e=t.tagName,t=t.namespaceURI)t=Jd(t),e=$d(t,e);else switch(e){case"svg":e=1;break;case"math":e=2;break;default:e=0}}B(I),Q(I,e)}function He(){B(I),B(se),B(fe)}function Jl(e){e.memoizedState!==null&&Q(Ee,e);var t=I.current,a=$d(t,e.type);t!==a&&(Q(se,e),Q(I,a))}function Fn(e){se.current===e&&(B(I),B(se)),Ee.current===e&&(B(Ee),Ln._currentValue=ne)}var zr,Eu;function Ba(e){if(zr===void 0)try{throw Error()}catch(a){var t=a.stack.trim().match(/\n( *(at )?)/);zr=t&&t[1]||"",Eu=-1<a.stack.indexOf(`
    at`)?" (<anonymous>)":-1<a.stack.indexOf("@")?"@unknown:0:0":""}return`
`+zr+e+Eu}var Ar=!1;function Cr(e,t){if(!e||Ar)return"";Ar=!0;var a=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var l={DetermineComponentFrameRoot:function(){try{if(t){var M=function(){throw Error()};if(Object.defineProperty(M.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(M,[])}catch(C){var A=C}Reflect.construct(e,[],M)}else{try{M.call()}catch(C){A=C}e.call(M.prototype)}}else{try{throw Error()}catch(C){A=C}(M=e())&&typeof M.catch=="function"&&M.catch(function(){})}}catch(C){if(C&&A&&typeof C.stack=="string")return[C.stack,A.stack]}return[null,null]}};l.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var n=Object.getOwnPropertyDescriptor(l.DetermineComponentFrameRoot,"name");n&&n.configurable&&Object.defineProperty(l.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var i=l.DetermineComponentFrameRoot(),s=i[0],d=i[1];if(s&&d){var v=s.split(`
`),T=d.split(`
`);for(n=l=0;l<v.length&&!v[l].includes("DetermineComponentFrameRoot");)l++;for(;n<T.length&&!T[n].includes("DetermineComponentFrameRoot");)n++;if(l===v.length||n===T.length)for(l=v.length-1,n=T.length-1;1<=l&&0<=n&&v[l]!==T[n];)n--;for(;1<=l&&0<=n;l--,n--)if(v[l]!==T[n]){if(l!==1||n!==1)do if(l--,n--,0>n||v[l]!==T[n]){var _=`
`+v[l].replace(" at new "," at ");return e.displayName&&_.includes("<anonymous>")&&(_=_.replace("<anonymous>",e.displayName)),_}while(1<=l&&0<=n);break}}}finally{Ar=!1,Error.prepareStackTrace=a}return(a=e?e.displayName||e.name:"")?Ba(a):""}function yh(e,t){switch(e.tag){case 26:case 27:case 5:return Ba(e.type);case 16:return Ba("Lazy");case 13:return e.child!==t&&t!==null?Ba("Suspense Fallback"):Ba("Suspense");case 19:return Ba("SuspenseList");case 0:case 15:return Cr(e.type,!1);case 11:return Cr(e.type.render,!1);case 1:return Cr(e.type,!0);case 31:return Ba("Activity");default:return""}}function ju(e){try{var t="",a=null;do t+=yh(e,a),a=e,e=e.return;while(e);return t}catch(l){return`
Error generating stack: `+l.message+`
`+l.stack}}var _r=Object.prototype.hasOwnProperty,Rr=r.unstable_scheduleCallback,Or=r.unstable_cancelCallback,bh=r.unstable_shouldYield,Sh=r.unstable_requestPaint,dt=r.unstable_now,wh=r.unstable_getCurrentPriorityLevel,Nu=r.unstable_ImmediatePriority,Tu=r.unstable_UserBlockingPriority,Wn=r.unstable_NormalPriority,Eh=r.unstable_LowPriority,zu=r.unstable_IdlePriority,jh=r.log,Nh=r.unstable_setDisableYieldValue,$l=null,mt=null;function ca(e){if(typeof jh=="function"&&Nh(e),mt&&typeof mt.setStrictMode=="function")try{mt.setStrictMode($l,e)}catch{}}var ht=Math.clz32?Math.clz32:Ah,Th=Math.log,zh=Math.LN2;function Ah(e){return e>>>=0,e===0?32:31-(Th(e)/zh|0)|0}var In=256,Pn=262144,ei=4194304;function ka(e){var t=e&42;if(t!==0)return t;switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return e&261888;case 262144:case 524288:case 1048576:case 2097152:return e&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return e&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return e}}function ti(e,t,a){var l=e.pendingLanes;if(l===0)return 0;var n=0,i=e.suspendedLanes,s=e.pingedLanes;e=e.warmLanes;var d=l&134217727;return d!==0?(l=d&~i,l!==0?n=ka(l):(s&=d,s!==0?n=ka(s):a||(a=d&~e,a!==0&&(n=ka(a))))):(d=l&~i,d!==0?n=ka(d):s!==0?n=ka(s):a||(a=l&~e,a!==0&&(n=ka(a)))),n===0?0:t!==0&&t!==n&&(t&i)===0&&(i=n&-n,a=t&-t,i>=a||i===32&&(a&4194048)!==0)?t:n}function Fl(e,t){return(e.pendingLanes&~(e.suspendedLanes&~e.pingedLanes)&t)===0}function Ch(e,t){switch(e){case 1:case 2:case 4:case 8:case 64:return t+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Au(){var e=ei;return ei<<=1,(ei&62914560)===0&&(ei=4194304),e}function Mr(e){for(var t=[],a=0;31>a;a++)t.push(e);return t}function Wl(e,t){e.pendingLanes|=t,t!==268435456&&(e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0)}function _h(e,t,a,l,n,i){var s=e.pendingLanes;e.pendingLanes=a,e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0,e.expiredLanes&=a,e.entangledLanes&=a,e.errorRecoveryDisabledLanes&=a,e.shellSuspendCounter=0;var d=e.entanglements,v=e.expirationTimes,T=e.hiddenUpdates;for(a=s&~a;0<a;){var _=31-ht(a),M=1<<_;d[_]=0,v[_]=-1;var A=T[_];if(A!==null)for(T[_]=null,_=0;_<A.length;_++){var C=A[_];C!==null&&(C.lane&=-536870913)}a&=~M}l!==0&&Cu(e,l,0),i!==0&&n===0&&e.tag!==0&&(e.suspendedLanes|=i&~(s&~t))}function Cu(e,t,a){e.pendingLanes|=t,e.suspendedLanes&=~t;var l=31-ht(t);e.entangledLanes|=t,e.entanglements[l]=e.entanglements[l]|1073741824|a&261930}function _u(e,t){var a=e.entangledLanes|=t;for(e=e.entanglements;a;){var l=31-ht(a),n=1<<l;n&t|e[l]&t&&(e[l]|=t),a&=~n}}function Ru(e,t){var a=t&-t;return a=(a&42)!==0?1:Dr(a),(a&(e.suspendedLanes|t))!==0?0:a}function Dr(e){switch(e){case 2:e=1;break;case 8:e=4;break;case 32:e=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:e=128;break;case 268435456:e=134217728;break;default:e=0}return e}function Ur(e){return e&=-e,2<e?8<e?(e&134217727)!==0?32:268435456:8:2}function Ou(){var e=X.p;return e!==0?e:(e=window.event,e===void 0?32:xm(e.type))}function Mu(e,t){var a=X.p;try{return X.p=e,t()}finally{X.p=a}}var fa=Math.random().toString(36).slice(2),$e="__reactFiber$"+fa,it="__reactProps$"+fa,nl="__reactContainer$"+fa,Br="__reactEvents$"+fa,Rh="__reactListeners$"+fa,Oh="__reactHandles$"+fa,Du="__reactResources$"+fa,Il="__reactMarker$"+fa;function kr(e){delete e[$e],delete e[it],delete e[Br],delete e[Rh],delete e[Oh]}function il(e){var t=e[$e];if(t)return t;for(var a=e.parentNode;a;){if(t=a[nl]||a[$e]){if(a=t.alternate,t.child!==null||a!==null&&a.child!==null)for(e=am(e);e!==null;){if(a=e[$e])return a;e=am(e)}return t}e=a,a=e.parentNode}return null}function rl(e){if(e=e[$e]||e[nl]){var t=e.tag;if(t===5||t===6||t===13||t===31||t===26||t===27||t===3)return e}return null}function Pl(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e.stateNode;throw Error(u(33))}function ol(e){var t=e[Du];return t||(t=e[Du]={hoistableStyles:new Map,hoistableScripts:new Map}),t}function Ke(e){e[Il]=!0}var Uu=new Set,Bu={};function La(e,t){sl(e,t),sl(e+"Capture",t)}function sl(e,t){for(Bu[e]=t,e=0;e<t.length;e++)Uu.add(t[e])}var Mh=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),ku={},Lu={};function Dh(e){return _r.call(Lu,e)?!0:_r.call(ku,e)?!1:Mh.test(e)?Lu[e]=!0:(ku[e]=!0,!1)}function ai(e,t,a){if(Dh(t))if(a===null)e.removeAttribute(t);else{switch(typeof a){case"undefined":case"function":case"symbol":e.removeAttribute(t);return;case"boolean":var l=t.toLowerCase().slice(0,5);if(l!=="data-"&&l!=="aria-"){e.removeAttribute(t);return}}e.setAttribute(t,""+a)}}function li(e,t,a){if(a===null)e.removeAttribute(t);else{switch(typeof a){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(t);return}e.setAttribute(t,""+a)}}function Qt(e,t,a,l){if(l===null)e.removeAttribute(a);else{switch(typeof l){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(a);return}e.setAttributeNS(t,a,""+l)}}function Et(e){switch(typeof e){case"bigint":case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Hu(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Uh(e,t,a){var l=Object.getOwnPropertyDescriptor(e.constructor.prototype,t);if(!e.hasOwnProperty(t)&&typeof l<"u"&&typeof l.get=="function"&&typeof l.set=="function"){var n=l.get,i=l.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return n.call(this)},set:function(s){a=""+s,i.call(this,s)}}),Object.defineProperty(e,t,{enumerable:l.enumerable}),{getValue:function(){return a},setValue:function(s){a=""+s},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Lr(e){if(!e._valueTracker){var t=Hu(e)?"checked":"value";e._valueTracker=Uh(e,t,""+e[t])}}function qu(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var a=t.getValue(),l="";return e&&(l=Hu(e)?e.checked?"true":"false":e.value),e=l,e!==a?(t.setValue(e),!0):!1}function ni(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}var Bh=/[\n"\\]/g;function jt(e){return e.replace(Bh,function(t){return"\\"+t.charCodeAt(0).toString(16)+" "})}function Hr(e,t,a,l,n,i,s,d){e.name="",s!=null&&typeof s!="function"&&typeof s!="symbol"&&typeof s!="boolean"?e.type=s:e.removeAttribute("type"),t!=null?s==="number"?(t===0&&e.value===""||e.value!=t)&&(e.value=""+Et(t)):e.value!==""+Et(t)&&(e.value=""+Et(t)):s!=="submit"&&s!=="reset"||e.removeAttribute("value"),t!=null?qr(e,s,Et(t)):a!=null?qr(e,s,Et(a)):l!=null&&e.removeAttribute("value"),n==null&&i!=null&&(e.defaultChecked=!!i),n!=null&&(e.checked=n&&typeof n!="function"&&typeof n!="symbol"),d!=null&&typeof d!="function"&&typeof d!="symbol"&&typeof d!="boolean"?e.name=""+Et(d):e.removeAttribute("name")}function Yu(e,t,a,l,n,i,s,d){if(i!=null&&typeof i!="function"&&typeof i!="symbol"&&typeof i!="boolean"&&(e.type=i),t!=null||a!=null){if(!(i!=="submit"&&i!=="reset"||t!=null)){Lr(e);return}a=a!=null?""+Et(a):"",t=t!=null?""+Et(t):a,d||t===e.value||(e.value=t),e.defaultValue=t}l=l??n,l=typeof l!="function"&&typeof l!="symbol"&&!!l,e.checked=d?e.checked:!!l,e.defaultChecked=!!l,s!=null&&typeof s!="function"&&typeof s!="symbol"&&typeof s!="boolean"&&(e.name=s),Lr(e)}function qr(e,t,a){t==="number"&&ni(e.ownerDocument)===e||e.defaultValue===""+a||(e.defaultValue=""+a)}function ul(e,t,a,l){if(e=e.options,t){t={};for(var n=0;n<a.length;n++)t["$"+a[n]]=!0;for(a=0;a<e.length;a++)n=t.hasOwnProperty("$"+e[a].value),e[a].selected!==n&&(e[a].selected=n),n&&l&&(e[a].defaultSelected=!0)}else{for(a=""+Et(a),t=null,n=0;n<e.length;n++){if(e[n].value===a){e[n].selected=!0,l&&(e[n].defaultSelected=!0);return}t!==null||e[n].disabled||(t=e[n])}t!==null&&(t.selected=!0)}}function Gu(e,t,a){if(t!=null&&(t=""+Et(t),t!==e.value&&(e.value=t),a==null)){e.defaultValue!==t&&(e.defaultValue=t);return}e.defaultValue=a!=null?""+Et(a):""}function Xu(e,t,a,l){if(t==null){if(l!=null){if(a!=null)throw Error(u(92));if(ye(l)){if(1<l.length)throw Error(u(93));l=l[0]}a=l}a==null&&(a=""),t=a}a=Et(t),e.defaultValue=a,l=e.textContent,l===a&&l!==""&&l!==null&&(e.value=l),Lr(e)}function cl(e,t){if(t){var a=e.firstChild;if(a&&a===e.lastChild&&a.nodeType===3){a.nodeValue=t;return}}e.textContent=t}var kh=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function Vu(e,t,a){var l=t.indexOf("--")===0;a==null||typeof a=="boolean"||a===""?l?e.setProperty(t,""):t==="float"?e.cssFloat="":e[t]="":l?e.setProperty(t,a):typeof a!="number"||a===0||kh.has(t)?t==="float"?e.cssFloat=a:e[t]=(""+a).trim():e[t]=a+"px"}function Qu(e,t,a){if(t!=null&&typeof t!="object")throw Error(u(62));if(e=e.style,a!=null){for(var l in a)!a.hasOwnProperty(l)||t!=null&&t.hasOwnProperty(l)||(l.indexOf("--")===0?e.setProperty(l,""):l==="float"?e.cssFloat="":e[l]="");for(var n in t)l=t[n],t.hasOwnProperty(n)&&a[n]!==l&&Vu(e,n,l)}else for(var i in t)t.hasOwnProperty(i)&&Vu(e,i,t[i])}function Yr(e){if(e.indexOf("-")===-1)return!1;switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Lh=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),Hh=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function ii(e){return Hh.test(""+e)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":e}function Zt(){}var Gr=null;function Xr(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var fl=null,dl=null;function Zu(e){var t=rl(e);if(t&&(e=t.stateNode)){var a=e[it]||null;e:switch(e=t.stateNode,t.type){case"input":if(Hr(e,a.value,a.defaultValue,a.defaultValue,a.checked,a.defaultChecked,a.type,a.name),t=a.name,a.type==="radio"&&t!=null){for(a=e;a.parentNode;)a=a.parentNode;for(a=a.querySelectorAll('input[name="'+jt(""+t)+'"][type="radio"]'),t=0;t<a.length;t++){var l=a[t];if(l!==e&&l.form===e.form){var n=l[it]||null;if(!n)throw Error(u(90));Hr(l,n.value,n.defaultValue,n.defaultValue,n.checked,n.defaultChecked,n.type,n.name)}}for(t=0;t<a.length;t++)l=a[t],l.form===e.form&&qu(l)}break e;case"textarea":Gu(e,a.value,a.defaultValue);break e;case"select":t=a.value,t!=null&&ul(e,!!a.multiple,t,!1)}}}var Vr=!1;function Ku(e,t,a){if(Vr)return e(t,a);Vr=!0;try{var l=e(t);return l}finally{if(Vr=!1,(fl!==null||dl!==null)&&(Zi(),fl&&(t=fl,e=dl,dl=fl=null,Zu(t),e)))for(t=0;t<e.length;t++)Zu(e[t])}}function en(e,t){var a=e.stateNode;if(a===null)return null;var l=a[it]||null;if(l===null)return null;a=l[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(l=!l.disabled)||(e=e.type,l=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!l;break e;default:e=!1}if(e)return null;if(a&&typeof a!="function")throw Error(u(231,t,typeof a));return a}var Kt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Qr=!1;if(Kt)try{var tn={};Object.defineProperty(tn,"passive",{get:function(){Qr=!0}}),window.addEventListener("test",tn,tn),window.removeEventListener("test",tn,tn)}catch{Qr=!1}var da=null,Zr=null,ri=null;function Ju(){if(ri)return ri;var e,t=Zr,a=t.length,l,n="value"in da?da.value:da.textContent,i=n.length;for(e=0;e<a&&t[e]===n[e];e++);var s=a-e;for(l=1;l<=s&&t[a-l]===n[i-l];l++);return ri=n.slice(e,1<l?1-l:void 0)}function oi(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function si(){return!0}function $u(){return!1}function rt(e){function t(a,l,n,i,s){this._reactName=a,this._targetInst=n,this.type=l,this.nativeEvent=i,this.target=s,this.currentTarget=null;for(var d in e)e.hasOwnProperty(d)&&(a=e[d],this[d]=a?a(i):i[d]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?si:$u,this.isPropagationStopped=$u,this}return E(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var a=this.nativeEvent;a&&(a.preventDefault?a.preventDefault():typeof a.returnValue!="unknown"&&(a.returnValue=!1),this.isDefaultPrevented=si)},stopPropagation:function(){var a=this.nativeEvent;a&&(a.stopPropagation?a.stopPropagation():typeof a.cancelBubble!="unknown"&&(a.cancelBubble=!0),this.isPropagationStopped=si)},persist:function(){},isPersistent:si}),t}var Ha={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},ui=rt(Ha),an=E({},Ha,{view:0,detail:0}),qh=rt(an),Kr,Jr,ln,ci=E({},an,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Fr,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==ln&&(ln&&e.type==="mousemove"?(Kr=e.screenX-ln.screenX,Jr=e.screenY-ln.screenY):Jr=Kr=0,ln=e),Kr)},movementY:function(e){return"movementY"in e?e.movementY:Jr}}),Fu=rt(ci),Yh=E({},ci,{dataTransfer:0}),Gh=rt(Yh),Xh=E({},an,{relatedTarget:0}),$r=rt(Xh),Vh=E({},Ha,{animationName:0,elapsedTime:0,pseudoElement:0}),Qh=rt(Vh),Zh=E({},Ha,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Kh=rt(Zh),Jh=E({},Ha,{data:0}),Wu=rt(Jh),$h={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Fh={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Wh={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Ih(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Wh[e])?!!t[e]:!1}function Fr(){return Ih}var Ph=E({},an,{key:function(e){if(e.key){var t=$h[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=oi(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Fh[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Fr,charCode:function(e){return e.type==="keypress"?oi(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?oi(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),ep=rt(Ph),tp=E({},ci,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Iu=rt(tp),ap=E({},an,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Fr}),lp=rt(ap),np=E({},Ha,{propertyName:0,elapsedTime:0,pseudoElement:0}),ip=rt(np),rp=E({},ci,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),op=rt(rp),sp=E({},Ha,{newState:0,oldState:0}),up=rt(sp),cp=[9,13,27,32],Wr=Kt&&"CompositionEvent"in window,nn=null;Kt&&"documentMode"in document&&(nn=document.documentMode);var fp=Kt&&"TextEvent"in window&&!nn,Pu=Kt&&(!Wr||nn&&8<nn&&11>=nn),ec=" ",tc=!1;function ac(e,t){switch(e){case"keyup":return cp.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function lc(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var ml=!1;function dp(e,t){switch(e){case"compositionend":return lc(t);case"keypress":return t.which!==32?null:(tc=!0,ec);case"textInput":return e=t.data,e===ec&&tc?null:e;default:return null}}function mp(e,t){if(ml)return e==="compositionend"||!Wr&&ac(e,t)?(e=Ju(),ri=Zr=da=null,ml=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Pu&&t.locale!=="ko"?null:t.data;default:return null}}var hp={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function nc(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!hp[e.type]:t==="textarea"}function ic(e,t,a,l){fl?dl?dl.push(l):dl=[l]:fl=l,t=Pi(t,"onChange"),0<t.length&&(a=new ui("onChange","change",null,a,l),e.push({event:a,listeners:t}))}var rn=null,on=null;function pp(e){Gd(e,0)}function fi(e){var t=Pl(e);if(qu(t))return e}function rc(e,t){if(e==="change")return t}var oc=!1;if(Kt){var Ir;if(Kt){var Pr="oninput"in document;if(!Pr){var sc=document.createElement("div");sc.setAttribute("oninput","return;"),Pr=typeof sc.oninput=="function"}Ir=Pr}else Ir=!1;oc=Ir&&(!document.documentMode||9<document.documentMode)}function uc(){rn&&(rn.detachEvent("onpropertychange",cc),on=rn=null)}function cc(e){if(e.propertyName==="value"&&fi(on)){var t=[];ic(t,on,e,Xr(e)),Ku(pp,t)}}function gp(e,t,a){e==="focusin"?(uc(),rn=t,on=a,rn.attachEvent("onpropertychange",cc)):e==="focusout"&&uc()}function vp(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return fi(on)}function xp(e,t){if(e==="click")return fi(t)}function yp(e,t){if(e==="input"||e==="change")return fi(t)}function bp(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var pt=typeof Object.is=="function"?Object.is:bp;function sn(e,t){if(pt(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var a=Object.keys(e),l=Object.keys(t);if(a.length!==l.length)return!1;for(l=0;l<a.length;l++){var n=a[l];if(!_r.call(t,n)||!pt(e[n],t[n]))return!1}return!0}function fc(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function dc(e,t){var a=fc(e);e=0;for(var l;a;){if(a.nodeType===3){if(l=e+a.textContent.length,e<=t&&l>=t)return{node:a,offset:t-e};e=l}e:{for(;a;){if(a.nextSibling){a=a.nextSibling;break e}a=a.parentNode}a=void 0}a=fc(a)}}function mc(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?mc(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function hc(e){e=e!=null&&e.ownerDocument!=null&&e.ownerDocument.defaultView!=null?e.ownerDocument.defaultView:window;for(var t=ni(e.document);t instanceof e.HTMLIFrameElement;){try{var a=typeof t.contentWindow.location.href=="string"}catch{a=!1}if(a)e=t.contentWindow;else break;t=ni(e.document)}return t}function eo(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}var Sp=Kt&&"documentMode"in document&&11>=document.documentMode,hl=null,to=null,un=null,ao=!1;function pc(e,t,a){var l=a.window===a?a.document:a.nodeType===9?a:a.ownerDocument;ao||hl==null||hl!==ni(l)||(l=hl,"selectionStart"in l&&eo(l)?l={start:l.selectionStart,end:l.selectionEnd}:(l=(l.ownerDocument&&l.ownerDocument.defaultView||window).getSelection(),l={anchorNode:l.anchorNode,anchorOffset:l.anchorOffset,focusNode:l.focusNode,focusOffset:l.focusOffset}),un&&sn(un,l)||(un=l,l=Pi(to,"onSelect"),0<l.length&&(t=new ui("onSelect","select",null,t,a),e.push({event:t,listeners:l}),t.target=hl)))}function qa(e,t){var a={};return a[e.toLowerCase()]=t.toLowerCase(),a["Webkit"+e]="webkit"+t,a["Moz"+e]="moz"+t,a}var pl={animationend:qa("Animation","AnimationEnd"),animationiteration:qa("Animation","AnimationIteration"),animationstart:qa("Animation","AnimationStart"),transitionrun:qa("Transition","TransitionRun"),transitionstart:qa("Transition","TransitionStart"),transitioncancel:qa("Transition","TransitionCancel"),transitionend:qa("Transition","TransitionEnd")},lo={},gc={};Kt&&(gc=document.createElement("div").style,"AnimationEvent"in window||(delete pl.animationend.animation,delete pl.animationiteration.animation,delete pl.animationstart.animation),"TransitionEvent"in window||delete pl.transitionend.transition);function Ya(e){if(lo[e])return lo[e];if(!pl[e])return e;var t=pl[e],a;for(a in t)if(t.hasOwnProperty(a)&&a in gc)return lo[e]=t[a];return e}var vc=Ya("animationend"),xc=Ya("animationiteration"),yc=Ya("animationstart"),wp=Ya("transitionrun"),Ep=Ya("transitionstart"),jp=Ya("transitioncancel"),bc=Ya("transitionend"),Sc=new Map,no="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");no.push("scrollEnd");function Mt(e,t){Sc.set(e,t),La(t,[e])}var di=typeof reportError=="function"?reportError:function(e){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var t=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof e=="object"&&e!==null&&typeof e.message=="string"?String(e.message):String(e),error:e});if(!window.dispatchEvent(t))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",e);return}console.error(e)},Nt=[],gl=0,io=0;function mi(){for(var e=gl,t=io=gl=0;t<e;){var a=Nt[t];Nt[t++]=null;var l=Nt[t];Nt[t++]=null;var n=Nt[t];Nt[t++]=null;var i=Nt[t];if(Nt[t++]=null,l!==null&&n!==null){var s=l.pending;s===null?n.next=n:(n.next=s.next,s.next=n),l.pending=n}i!==0&&wc(a,n,i)}}function hi(e,t,a,l){Nt[gl++]=e,Nt[gl++]=t,Nt[gl++]=a,Nt[gl++]=l,io|=l,e.lanes|=l,e=e.alternate,e!==null&&(e.lanes|=l)}function ro(e,t,a,l){return hi(e,t,a,l),pi(e)}function Ga(e,t){return hi(e,null,null,t),pi(e)}function wc(e,t,a){e.lanes|=a;var l=e.alternate;l!==null&&(l.lanes|=a);for(var n=!1,i=e.return;i!==null;)i.childLanes|=a,l=i.alternate,l!==null&&(l.childLanes|=a),i.tag===22&&(e=i.stateNode,e===null||e._visibility&1||(n=!0)),e=i,i=i.return;return e.tag===3?(i=e.stateNode,n&&t!==null&&(n=31-ht(a),e=i.hiddenUpdates,l=e[n],l===null?e[n]=[t]:l.push(t),t.lane=a|536870912),i):null}function pi(e){if(50<Rn)throw Rn=0,gs=null,Error(u(185));for(var t=e.return;t!==null;)e=t,t=e.return;return e.tag===3?e.stateNode:null}var vl={};function Np(e,t,a,l){this.tag=e,this.key=a,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=l,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function gt(e,t,a,l){return new Np(e,t,a,l)}function oo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Jt(e,t){var a=e.alternate;return a===null?(a=gt(e.tag,t,e.key,e.mode),a.elementType=e.elementType,a.type=e.type,a.stateNode=e.stateNode,a.alternate=e,e.alternate=a):(a.pendingProps=t,a.type=e.type,a.flags=0,a.subtreeFlags=0,a.deletions=null),a.flags=e.flags&65011712,a.childLanes=e.childLanes,a.lanes=e.lanes,a.child=e.child,a.memoizedProps=e.memoizedProps,a.memoizedState=e.memoizedState,a.updateQueue=e.updateQueue,t=e.dependencies,a.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},a.sibling=e.sibling,a.index=e.index,a.ref=e.ref,a.refCleanup=e.refCleanup,a}function Ec(e,t){e.flags&=65011714;var a=e.alternate;return a===null?(e.childLanes=0,e.lanes=t,e.child=null,e.subtreeFlags=0,e.memoizedProps=null,e.memoizedState=null,e.updateQueue=null,e.dependencies=null,e.stateNode=null):(e.childLanes=a.childLanes,e.lanes=a.lanes,e.child=a.child,e.subtreeFlags=0,e.deletions=null,e.memoizedProps=a.memoizedProps,e.memoizedState=a.memoizedState,e.updateQueue=a.updateQueue,e.type=a.type,t=a.dependencies,e.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),e}function gi(e,t,a,l,n,i){var s=0;if(l=e,typeof e=="function")oo(e)&&(s=1);else if(typeof e=="string")s=_g(e,a,I.current)?26:e==="html"||e==="head"||e==="body"?27:5;else e:switch(e){case W:return e=gt(31,a,t,n),e.elementType=W,e.lanes=i,e;case k:return Xa(a.children,n,i,t);case H:s=8,n|=24;break;case U:return e=gt(12,a,t,n|2),e.elementType=U,e.lanes=i,e;case K:return e=gt(13,a,t,n),e.elementType=K,e.lanes=i,e;case ee:return e=gt(19,a,t,n),e.elementType=ee,e.lanes=i,e;default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case L:s=10;break e;case J:s=9;break e;case F:s=11;break e;case G:s=14;break e;case oe:s=16,l=null;break e}s=29,a=Error(u(130,e===null?"null":typeof e,"")),l=null}return t=gt(s,a,t,n),t.elementType=e,t.type=l,t.lanes=i,t}function Xa(e,t,a,l){return e=gt(7,e,l,t),e.lanes=a,e}function so(e,t,a){return e=gt(6,e,null,t),e.lanes=a,e}function jc(e){var t=gt(18,null,null,0);return t.stateNode=e,t}function uo(e,t,a){return t=gt(4,e.children!==null?e.children:[],e.key,t),t.lanes=a,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}var Nc=new WeakMap;function Tt(e,t){if(typeof e=="object"&&e!==null){var a=Nc.get(e);return a!==void 0?a:(t={value:e,source:t,stack:ju(t)},Nc.set(e,t),t)}return{value:e,source:t,stack:ju(t)}}var xl=[],yl=0,vi=null,cn=0,zt=[],At=0,ma=null,Ht=1,qt="";function $t(e,t){xl[yl++]=cn,xl[yl++]=vi,vi=e,cn=t}function Tc(e,t,a){zt[At++]=Ht,zt[At++]=qt,zt[At++]=ma,ma=e;var l=Ht;e=qt;var n=32-ht(l)-1;l&=~(1<<n),a+=1;var i=32-ht(t)+n;if(30<i){var s=n-n%5;i=(l&(1<<s)-1).toString(32),l>>=s,n-=s,Ht=1<<32-ht(t)+n|a<<n|l,qt=i+e}else Ht=1<<i|a<<n|l,qt=e}function co(e){e.return!==null&&($t(e,1),Tc(e,1,0))}function fo(e){for(;e===vi;)vi=xl[--yl],xl[yl]=null,cn=xl[--yl],xl[yl]=null;for(;e===ma;)ma=zt[--At],zt[At]=null,qt=zt[--At],zt[At]=null,Ht=zt[--At],zt[At]=null}function zc(e,t){zt[At++]=Ht,zt[At++]=qt,zt[At++]=ma,Ht=t.id,qt=t.overflow,ma=e}var Fe=null,Me=null,ve=!1,ha=null,Ct=!1,mo=Error(u(519));function pa(e){var t=Error(u(418,1<arguments.length&&arguments[1]!==void 0&&arguments[1]?"text":"HTML",""));throw fn(Tt(t,e)),mo}function Ac(e){var t=e.stateNode,a=e.type,l=e.memoizedProps;switch(t[$e]=e,t[it]=l,a){case"dialog":me("cancel",t),me("close",t);break;case"iframe":case"object":case"embed":me("load",t);break;case"video":case"audio":for(a=0;a<Mn.length;a++)me(Mn[a],t);break;case"source":me("error",t);break;case"img":case"image":case"link":me("error",t),me("load",t);break;case"details":me("toggle",t);break;case"input":me("invalid",t),Yu(t,l.value,l.defaultValue,l.checked,l.defaultChecked,l.type,l.name,!0);break;case"select":me("invalid",t);break;case"textarea":me("invalid",t),Xu(t,l.value,l.defaultValue,l.children)}a=l.children,typeof a!="string"&&typeof a!="number"&&typeof a!="bigint"||t.textContent===""+a||l.suppressHydrationWarning===!0||Zd(t.textContent,a)?(l.popover!=null&&(me("beforetoggle",t),me("toggle",t)),l.onScroll!=null&&me("scroll",t),l.onScrollEnd!=null&&me("scrollend",t),l.onClick!=null&&(t.onclick=Zt),t=!0):t=!1,t||pa(e,!0)}function Cc(e){for(Fe=e.return;Fe;)switch(Fe.tag){case 5:case 31:case 13:Ct=!1;return;case 27:case 3:Ct=!0;return;default:Fe=Fe.return}}function bl(e){if(e!==Fe)return!1;if(!ve)return Cc(e),ve=!0,!1;var t=e.tag,a;if((a=t!==3&&t!==27)&&((a=t===5)&&(a=e.type,a=!(a!=="form"&&a!=="button")||Rs(e.type,e.memoizedProps)),a=!a),a&&Me&&pa(e),Cc(e),t===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(u(317));Me=tm(e)}else if(t===31){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(u(317));Me=tm(e)}else t===27?(t=Me,Ca(e.type)?(e=Bs,Bs=null,Me=e):Me=t):Me=Fe?Rt(e.stateNode.nextSibling):null;return!0}function Va(){Me=Fe=null,ve=!1}function ho(){var e=ha;return e!==null&&(ct===null?ct=e:ct.push.apply(ct,e),ha=null),e}function fn(e){ha===null?ha=[e]:ha.push(e)}var po=S(null),Qa=null,Ft=null;function ga(e,t,a){Q(po,t._currentValue),t._currentValue=a}function Wt(e){e._currentValue=po.current,B(po)}function go(e,t,a){for(;e!==null;){var l=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,l!==null&&(l.childLanes|=t)):l!==null&&(l.childLanes&t)!==t&&(l.childLanes|=t),e===a)break;e=e.return}}function vo(e,t,a,l){var n=e.child;for(n!==null&&(n.return=e);n!==null;){var i=n.dependencies;if(i!==null){var s=n.child;i=i.firstContext;e:for(;i!==null;){var d=i;i=n;for(var v=0;v<t.length;v++)if(d.context===t[v]){i.lanes|=a,d=i.alternate,d!==null&&(d.lanes|=a),go(i.return,a,e),l||(s=null);break e}i=d.next}}else if(n.tag===18){if(s=n.return,s===null)throw Error(u(341));s.lanes|=a,i=s.alternate,i!==null&&(i.lanes|=a),go(s,a,e),s=null}else s=n.child;if(s!==null)s.return=n;else for(s=n;s!==null;){if(s===e){s=null;break}if(n=s.sibling,n!==null){n.return=s.return,s=n;break}s=s.return}n=s}}function Sl(e,t,a,l){e=null;for(var n=t,i=!1;n!==null;){if(!i){if((n.flags&524288)!==0)i=!0;else if((n.flags&262144)!==0)break}if(n.tag===10){var s=n.alternate;if(s===null)throw Error(u(387));if(s=s.memoizedProps,s!==null){var d=n.type;pt(n.pendingProps.value,s.value)||(e!==null?e.push(d):e=[d])}}else if(n===Ee.current){if(s=n.alternate,s===null)throw Error(u(387));s.memoizedState.memoizedState!==n.memoizedState.memoizedState&&(e!==null?e.push(Ln):e=[Ln])}n=n.return}e!==null&&vo(t,e,a,l),t.flags|=262144}function xi(e){for(e=e.firstContext;e!==null;){if(!pt(e.context._currentValue,e.memoizedValue))return!0;e=e.next}return!1}function Za(e){Qa=e,Ft=null,e=e.dependencies,e!==null&&(e.firstContext=null)}function We(e){return _c(Qa,e)}function yi(e,t){return Qa===null&&Za(e),_c(e,t)}function _c(e,t){var a=t._currentValue;if(t={context:t,memoizedValue:a,next:null},Ft===null){if(e===null)throw Error(u(308));Ft=t,e.dependencies={lanes:0,firstContext:t},e.flags|=524288}else Ft=Ft.next=t;return a}var Tp=typeof AbortController<"u"?AbortController:function(){var e=[],t=this.signal={aborted:!1,addEventListener:function(a,l){e.push(l)}};this.abort=function(){t.aborted=!0,e.forEach(function(a){return a()})}},zp=r.unstable_scheduleCallback,Ap=r.unstable_NormalPriority,Ge={$$typeof:L,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function xo(){return{controller:new Tp,data:new Map,refCount:0}}function dn(e){e.refCount--,e.refCount===0&&zp(Ap,function(){e.controller.abort()})}var mn=null,yo=0,wl=0,El=null;function Cp(e,t){if(mn===null){var a=mn=[];yo=0,wl=ws(),El={status:"pending",value:void 0,then:function(l){a.push(l)}}}return yo++,t.then(Rc,Rc),t}function Rc(){if(--yo===0&&mn!==null){El!==null&&(El.status="fulfilled");var e=mn;mn=null,wl=0,El=null;for(var t=0;t<e.length;t++)(0,e[t])()}}function _p(e,t){var a=[],l={status:"pending",value:null,reason:null,then:function(n){a.push(n)}};return e.then(function(){l.status="fulfilled",l.value=t;for(var n=0;n<a.length;n++)(0,a[n])(t)},function(n){for(l.status="rejected",l.reason=n,n=0;n<a.length;n++)(0,a[n])(void 0)}),l}var Oc=R.S;R.S=function(e,t){gd=dt(),typeof t=="object"&&t!==null&&typeof t.then=="function"&&Cp(e,t),Oc!==null&&Oc(e,t)};var Ka=S(null);function bo(){var e=Ka.current;return e!==null?e:Re.pooledCache}function bi(e,t){t===null?Q(Ka,Ka.current):Q(Ka,t.pool)}function Mc(){var e=bo();return e===null?null:{parent:Ge._currentValue,pool:e}}var jl=Error(u(460)),So=Error(u(474)),Si=Error(u(542)),wi={then:function(){}};function Dc(e){return e=e.status,e==="fulfilled"||e==="rejected"}function Uc(e,t,a){switch(a=e[a],a===void 0?e.push(t):a!==t&&(t.then(Zt,Zt),t=a),t.status){case"fulfilled":return t.value;case"rejected":throw e=t.reason,kc(e),e;default:if(typeof t.status=="string")t.then(Zt,Zt);else{if(e=Re,e!==null&&100<e.shellSuspendCounter)throw Error(u(482));e=t,e.status="pending",e.then(function(l){if(t.status==="pending"){var n=t;n.status="fulfilled",n.value=l}},function(l){if(t.status==="pending"){var n=t;n.status="rejected",n.reason=l}})}switch(t.status){case"fulfilled":return t.value;case"rejected":throw e=t.reason,kc(e),e}throw $a=t,jl}}function Ja(e){try{var t=e._init;return t(e._payload)}catch(a){throw a!==null&&typeof a=="object"&&typeof a.then=="function"?($a=a,jl):a}}var $a=null;function Bc(){if($a===null)throw Error(u(459));var e=$a;return $a=null,e}function kc(e){if(e===jl||e===Si)throw Error(u(483))}var Nl=null,hn=0;function Ei(e){var t=hn;return hn+=1,Nl===null&&(Nl=[]),Uc(Nl,e,t)}function pn(e,t){t=t.props.ref,e.ref=t!==void 0?t:null}function ji(e,t){throw t.$$typeof===D?Error(u(525)):(e=Object.prototype.toString.call(t),Error(u(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)))}function Lc(e){function t(j,b){if(e){var N=j.deletions;N===null?(j.deletions=[b],j.flags|=16):N.push(b)}}function a(j,b){if(!e)return null;for(;b!==null;)t(j,b),b=b.sibling;return null}function l(j){for(var b=new Map;j!==null;)j.key!==null?b.set(j.key,j):b.set(j.index,j),j=j.sibling;return b}function n(j,b){return j=Jt(j,b),j.index=0,j.sibling=null,j}function i(j,b,N){return j.index=N,e?(N=j.alternate,N!==null?(N=N.index,N<b?(j.flags|=67108866,b):N):(j.flags|=67108866,b)):(j.flags|=1048576,b)}function s(j){return e&&j.alternate===null&&(j.flags|=67108866),j}function d(j,b,N,O){return b===null||b.tag!==6?(b=so(N,j.mode,O),b.return=j,b):(b=n(b,N),b.return=j,b)}function v(j,b,N,O){var te=N.type;return te===k?_(j,b,N.props.children,O,N.key):b!==null&&(b.elementType===te||typeof te=="object"&&te!==null&&te.$$typeof===oe&&Ja(te)===b.type)?(b=n(b,N.props),pn(b,N),b.return=j,b):(b=gi(N.type,N.key,N.props,null,j.mode,O),pn(b,N),b.return=j,b)}function T(j,b,N,O){return b===null||b.tag!==4||b.stateNode.containerInfo!==N.containerInfo||b.stateNode.implementation!==N.implementation?(b=uo(N,j.mode,O),b.return=j,b):(b=n(b,N.children||[]),b.return=j,b)}function _(j,b,N,O,te){return b===null||b.tag!==7?(b=Xa(N,j.mode,O,te),b.return=j,b):(b=n(b,N),b.return=j,b)}function M(j,b,N){if(typeof b=="string"&&b!==""||typeof b=="number"||typeof b=="bigint")return b=so(""+b,j.mode,N),b.return=j,b;if(typeof b=="object"&&b!==null){switch(b.$$typeof){case Y:return N=gi(b.type,b.key,b.props,null,j.mode,N),pn(N,b),N.return=j,N;case q:return b=uo(b,j.mode,N),b.return=j,b;case oe:return b=Ja(b),M(j,b,N)}if(ye(b)||ae(b))return b=Xa(b,j.mode,N,null),b.return=j,b;if(typeof b.then=="function")return M(j,Ei(b),N);if(b.$$typeof===L)return M(j,yi(j,b),N);ji(j,b)}return null}function A(j,b,N,O){var te=b!==null?b.key:null;if(typeof N=="string"&&N!==""||typeof N=="number"||typeof N=="bigint")return te!==null?null:d(j,b,""+N,O);if(typeof N=="object"&&N!==null){switch(N.$$typeof){case Y:return N.key===te?v(j,b,N,O):null;case q:return N.key===te?T(j,b,N,O):null;case oe:return N=Ja(N),A(j,b,N,O)}if(ye(N)||ae(N))return te!==null?null:_(j,b,N,O,null);if(typeof N.then=="function")return A(j,b,Ei(N),O);if(N.$$typeof===L)return A(j,b,yi(j,N),O);ji(j,N)}return null}function C(j,b,N,O,te){if(typeof O=="string"&&O!==""||typeof O=="number"||typeof O=="bigint")return j=j.get(N)||null,d(b,j,""+O,te);if(typeof O=="object"&&O!==null){switch(O.$$typeof){case Y:return j=j.get(O.key===null?N:O.key)||null,v(b,j,O,te);case q:return j=j.get(O.key===null?N:O.key)||null,T(b,j,O,te);case oe:return O=Ja(O),C(j,b,N,O,te)}if(ye(O)||ae(O))return j=j.get(N)||null,_(b,j,O,te,null);if(typeof O.then=="function")return C(j,b,N,Ei(O),te);if(O.$$typeof===L)return C(j,b,N,yi(b,O),te);ji(b,O)}return null}function $(j,b,N,O){for(var te=null,be=null,P=b,ce=b=0,ge=null;P!==null&&ce<N.length;ce++){P.index>ce?(ge=P,P=null):ge=P.sibling;var Se=A(j,P,N[ce],O);if(Se===null){P===null&&(P=ge);break}e&&P&&Se.alternate===null&&t(j,P),b=i(Se,b,ce),be===null?te=Se:be.sibling=Se,be=Se,P=ge}if(ce===N.length)return a(j,P),ve&&$t(j,ce),te;if(P===null){for(;ce<N.length;ce++)P=M(j,N[ce],O),P!==null&&(b=i(P,b,ce),be===null?te=P:be.sibling=P,be=P);return ve&&$t(j,ce),te}for(P=l(P);ce<N.length;ce++)ge=C(P,j,ce,N[ce],O),ge!==null&&(e&&ge.alternate!==null&&P.delete(ge.key===null?ce:ge.key),b=i(ge,b,ce),be===null?te=ge:be.sibling=ge,be=ge);return e&&P.forEach(function(Da){return t(j,Da)}),ve&&$t(j,ce),te}function le(j,b,N,O){if(N==null)throw Error(u(151));for(var te=null,be=null,P=b,ce=b=0,ge=null,Se=N.next();P!==null&&!Se.done;ce++,Se=N.next()){P.index>ce?(ge=P,P=null):ge=P.sibling;var Da=A(j,P,Se.value,O);if(Da===null){P===null&&(P=ge);break}e&&P&&Da.alternate===null&&t(j,P),b=i(Da,b,ce),be===null?te=Da:be.sibling=Da,be=Da,P=ge}if(Se.done)return a(j,P),ve&&$t(j,ce),te;if(P===null){for(;!Se.done;ce++,Se=N.next())Se=M(j,Se.value,O),Se!==null&&(b=i(Se,b,ce),be===null?te=Se:be.sibling=Se,be=Se);return ve&&$t(j,ce),te}for(P=l(P);!Se.done;ce++,Se=N.next())Se=C(P,j,ce,Se.value,O),Se!==null&&(e&&Se.alternate!==null&&P.delete(Se.key===null?ce:Se.key),b=i(Se,b,ce),be===null?te=Se:be.sibling=Se,be=Se);return e&&P.forEach(function(Yg){return t(j,Yg)}),ve&&$t(j,ce),te}function Ce(j,b,N,O){if(typeof N=="object"&&N!==null&&N.type===k&&N.key===null&&(N=N.props.children),typeof N=="object"&&N!==null){switch(N.$$typeof){case Y:e:{for(var te=N.key;b!==null;){if(b.key===te){if(te=N.type,te===k){if(b.tag===7){a(j,b.sibling),O=n(b,N.props.children),O.return=j,j=O;break e}}else if(b.elementType===te||typeof te=="object"&&te!==null&&te.$$typeof===oe&&Ja(te)===b.type){a(j,b.sibling),O=n(b,N.props),pn(O,N),O.return=j,j=O;break e}a(j,b);break}else t(j,b);b=b.sibling}N.type===k?(O=Xa(N.props.children,j.mode,O,N.key),O.return=j,j=O):(O=gi(N.type,N.key,N.props,null,j.mode,O),pn(O,N),O.return=j,j=O)}return s(j);case q:e:{for(te=N.key;b!==null;){if(b.key===te)if(b.tag===4&&b.stateNode.containerInfo===N.containerInfo&&b.stateNode.implementation===N.implementation){a(j,b.sibling),O=n(b,N.children||[]),O.return=j,j=O;break e}else{a(j,b);break}else t(j,b);b=b.sibling}O=uo(N,j.mode,O),O.return=j,j=O}return s(j);case oe:return N=Ja(N),Ce(j,b,N,O)}if(ye(N))return $(j,b,N,O);if(ae(N)){if(te=ae(N),typeof te!="function")throw Error(u(150));return N=te.call(N),le(j,b,N,O)}if(typeof N.then=="function")return Ce(j,b,Ei(N),O);if(N.$$typeof===L)return Ce(j,b,yi(j,N),O);ji(j,N)}return typeof N=="string"&&N!==""||typeof N=="number"||typeof N=="bigint"?(N=""+N,b!==null&&b.tag===6?(a(j,b.sibling),O=n(b,N),O.return=j,j=O):(a(j,b),O=so(N,j.mode,O),O.return=j,j=O),s(j)):a(j,b)}return function(j,b,N,O){try{hn=0;var te=Ce(j,b,N,O);return Nl=null,te}catch(P){if(P===jl||P===Si)throw P;var be=gt(29,P,null,j.mode);return be.lanes=O,be.return=j,be}finally{}}}var Fa=Lc(!0),Hc=Lc(!1),va=!1;function wo(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Eo(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,callbacks:null})}function xa(e){return{lane:e,tag:0,payload:null,callback:null,next:null}}function ya(e,t,a){var l=e.updateQueue;if(l===null)return null;if(l=l.shared,(we&2)!==0){var n=l.pending;return n===null?t.next=t:(t.next=n.next,n.next=t),l.pending=t,t=pi(e),wc(e,null,a),t}return hi(e,l,t,a),pi(e)}function gn(e,t,a){if(t=t.updateQueue,t!==null&&(t=t.shared,(a&4194048)!==0)){var l=t.lanes;l&=e.pendingLanes,a|=l,t.lanes=a,_u(e,a)}}function jo(e,t){var a=e.updateQueue,l=e.alternate;if(l!==null&&(l=l.updateQueue,a===l)){var n=null,i=null;if(a=a.firstBaseUpdate,a!==null){do{var s={lane:a.lane,tag:a.tag,payload:a.payload,callback:null,next:null};i===null?n=i=s:i=i.next=s,a=a.next}while(a!==null);i===null?n=i=t:i=i.next=t}else n=i=t;a={baseState:l.baseState,firstBaseUpdate:n,lastBaseUpdate:i,shared:l.shared,callbacks:l.callbacks},e.updateQueue=a;return}e=a.lastBaseUpdate,e===null?a.firstBaseUpdate=t:e.next=t,a.lastBaseUpdate=t}var No=!1;function vn(){if(No){var e=El;if(e!==null)throw e}}function xn(e,t,a,l){No=!1;var n=e.updateQueue;va=!1;var i=n.firstBaseUpdate,s=n.lastBaseUpdate,d=n.shared.pending;if(d!==null){n.shared.pending=null;var v=d,T=v.next;v.next=null,s===null?i=T:s.next=T,s=v;var _=e.alternate;_!==null&&(_=_.updateQueue,d=_.lastBaseUpdate,d!==s&&(d===null?_.firstBaseUpdate=T:d.next=T,_.lastBaseUpdate=v))}if(i!==null){var M=n.baseState;s=0,_=T=v=null,d=i;do{var A=d.lane&-536870913,C=A!==d.lane;if(C?(pe&A)===A:(l&A)===A){A!==0&&A===wl&&(No=!0),_!==null&&(_=_.next={lane:0,tag:d.tag,payload:d.payload,callback:null,next:null});e:{var $=e,le=d;A=t;var Ce=a;switch(le.tag){case 1:if($=le.payload,typeof $=="function"){M=$.call(Ce,M,A);break e}M=$;break e;case 3:$.flags=$.flags&-65537|128;case 0:if($=le.payload,A=typeof $=="function"?$.call(Ce,M,A):$,A==null)break e;M=E({},M,A);break e;case 2:va=!0}}A=d.callback,A!==null&&(e.flags|=64,C&&(e.flags|=8192),C=n.callbacks,C===null?n.callbacks=[A]:C.push(A))}else C={lane:A,tag:d.tag,payload:d.payload,callback:d.callback,next:null},_===null?(T=_=C,v=M):_=_.next=C,s|=A;if(d=d.next,d===null){if(d=n.shared.pending,d===null)break;C=d,d=C.next,C.next=null,n.lastBaseUpdate=C,n.shared.pending=null}}while(!0);_===null&&(v=M),n.baseState=v,n.firstBaseUpdate=T,n.lastBaseUpdate=_,i===null&&(n.shared.lanes=0),ja|=s,e.lanes=s,e.memoizedState=M}}function qc(e,t){if(typeof e!="function")throw Error(u(191,e));e.call(t)}function Yc(e,t){var a=e.callbacks;if(a!==null)for(e.callbacks=null,e=0;e<a.length;e++)qc(a[e],t)}var Tl=S(null),Ni=S(0);function Gc(e,t){e=ra,Q(Ni,e),Q(Tl,t),ra=e|t.baseLanes}function To(){Q(Ni,ra),Q(Tl,Tl.current)}function zo(){ra=Ni.current,B(Tl),B(Ni)}var vt=S(null),_t=null;function ba(e){var t=e.alternate;Q(qe,qe.current&1),Q(vt,e),_t===null&&(t===null||Tl.current!==null||t.memoizedState!==null)&&(_t=e)}function Ao(e){Q(qe,qe.current),Q(vt,e),_t===null&&(_t=e)}function Xc(e){e.tag===22?(Q(qe,qe.current),Q(vt,e),_t===null&&(_t=e)):Sa()}function Sa(){Q(qe,qe.current),Q(vt,vt.current)}function xt(e){B(vt),_t===e&&(_t=null),B(qe)}var qe=S(0);function Ti(e){for(var t=e;t!==null;){if(t.tag===13){var a=t.memoizedState;if(a!==null&&(a=a.dehydrated,a===null||Ds(a)||Us(a)))return t}else if(t.tag===19&&(t.memoizedProps.revealOrder==="forwards"||t.memoizedProps.revealOrder==="backwards"||t.memoizedProps.revealOrder==="unstable_legacy-backwards"||t.memoizedProps.revealOrder==="together")){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var It=0,ue=null,ze=null,Xe=null,zi=!1,zl=!1,Wa=!1,Ai=0,yn=0,Al=null,Rp=0;function ke(){throw Error(u(321))}function Co(e,t){if(t===null)return!1;for(var a=0;a<t.length&&a<e.length;a++)if(!pt(e[a],t[a]))return!1;return!0}function _o(e,t,a,l,n,i){return It=i,ue=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,R.H=e===null||e.memoizedState===null?zf:Qo,Wa=!1,i=a(l,n),Wa=!1,zl&&(i=Qc(t,a,l,n)),Vc(e),i}function Vc(e){R.H=wn;var t=ze!==null&&ze.next!==null;if(It=0,Xe=ze=ue=null,zi=!1,yn=0,Al=null,t)throw Error(u(300));e===null||Ve||(e=e.dependencies,e!==null&&xi(e)&&(Ve=!0))}function Qc(e,t,a,l){ue=e;var n=0;do{if(zl&&(Al=null),yn=0,zl=!1,25<=n)throw Error(u(301));if(n+=1,Xe=ze=null,e.updateQueue!=null){var i=e.updateQueue;i.lastEffect=null,i.events=null,i.stores=null,i.memoCache!=null&&(i.memoCache.index=0)}R.H=Af,i=t(a,l)}while(zl);return i}function Op(){var e=R.H,t=e.useState()[0];return t=typeof t.then=="function"?bn(t):t,e=e.useState()[0],(ze!==null?ze.memoizedState:null)!==e&&(ue.flags|=1024),t}function Ro(){var e=Ai!==0;return Ai=0,e}function Oo(e,t,a){t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~a}function Mo(e){if(zi){for(e=e.memoizedState;e!==null;){var t=e.queue;t!==null&&(t.pending=null),e=e.next}zi=!1}It=0,Xe=ze=ue=null,zl=!1,yn=Ai=0,Al=null}function at(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Xe===null?ue.memoizedState=Xe=e:Xe=Xe.next=e,Xe}function Ye(){if(ze===null){var e=ue.alternate;e=e!==null?e.memoizedState:null}else e=ze.next;var t=Xe===null?ue.memoizedState:Xe.next;if(t!==null)Xe=t,ze=e;else{if(e===null)throw ue.alternate===null?Error(u(467)):Error(u(310));ze=e,e={memoizedState:ze.memoizedState,baseState:ze.baseState,baseQueue:ze.baseQueue,queue:ze.queue,next:null},Xe===null?ue.memoizedState=Xe=e:Xe=Xe.next=e}return Xe}function Ci(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function bn(e){var t=yn;return yn+=1,Al===null&&(Al=[]),e=Uc(Al,e,t),t=ue,(Xe===null?t.memoizedState:Xe.next)===null&&(t=t.alternate,R.H=t===null||t.memoizedState===null?zf:Qo),e}function _i(e){if(e!==null&&typeof e=="object"){if(typeof e.then=="function")return bn(e);if(e.$$typeof===L)return We(e)}throw Error(u(438,String(e)))}function Do(e){var t=null,a=ue.updateQueue;if(a!==null&&(t=a.memoCache),t==null){var l=ue.alternate;l!==null&&(l=l.updateQueue,l!==null&&(l=l.memoCache,l!=null&&(t={data:l.data.map(function(n){return n.slice()}),index:0})))}if(t==null&&(t={data:[],index:0}),a===null&&(a=Ci(),ue.updateQueue=a),a.memoCache=t,a=t.data[t.index],a===void 0)for(a=t.data[t.index]=Array(e),l=0;l<e;l++)a[l]=V;return t.index++,a}function Pt(e,t){return typeof t=="function"?t(e):t}function Ri(e){var t=Ye();return Uo(t,ze,e)}function Uo(e,t,a){var l=e.queue;if(l===null)throw Error(u(311));l.lastRenderedReducer=a;var n=e.baseQueue,i=l.pending;if(i!==null){if(n!==null){var s=n.next;n.next=i.next,i.next=s}t.baseQueue=n=i,l.pending=null}if(i=e.baseState,n===null)e.memoizedState=i;else{t=n.next;var d=s=null,v=null,T=t,_=!1;do{var M=T.lane&-536870913;if(M!==T.lane?(pe&M)===M:(It&M)===M){var A=T.revertLane;if(A===0)v!==null&&(v=v.next={lane:0,revertLane:0,gesture:null,action:T.action,hasEagerState:T.hasEagerState,eagerState:T.eagerState,next:null}),M===wl&&(_=!0);else if((It&A)===A){T=T.next,A===wl&&(_=!0);continue}else M={lane:0,revertLane:T.revertLane,gesture:null,action:T.action,hasEagerState:T.hasEagerState,eagerState:T.eagerState,next:null},v===null?(d=v=M,s=i):v=v.next=M,ue.lanes|=A,ja|=A;M=T.action,Wa&&a(i,M),i=T.hasEagerState?T.eagerState:a(i,M)}else A={lane:M,revertLane:T.revertLane,gesture:T.gesture,action:T.action,hasEagerState:T.hasEagerState,eagerState:T.eagerState,next:null},v===null?(d=v=A,s=i):v=v.next=A,ue.lanes|=M,ja|=M;T=T.next}while(T!==null&&T!==t);if(v===null?s=i:v.next=d,!pt(i,e.memoizedState)&&(Ve=!0,_&&(a=El,a!==null)))throw a;e.memoizedState=i,e.baseState=s,e.baseQueue=v,l.lastRenderedState=i}return n===null&&(l.lanes=0),[e.memoizedState,l.dispatch]}function Bo(e){var t=Ye(),a=t.queue;if(a===null)throw Error(u(311));a.lastRenderedReducer=e;var l=a.dispatch,n=a.pending,i=t.memoizedState;if(n!==null){a.pending=null;var s=n=n.next;do i=e(i,s.action),s=s.next;while(s!==n);pt(i,t.memoizedState)||(Ve=!0),t.memoizedState=i,t.baseQueue===null&&(t.baseState=i),a.lastRenderedState=i}return[i,l]}function Zc(e,t,a){var l=ue,n=Ye(),i=ve;if(i){if(a===void 0)throw Error(u(407));a=a()}else a=t();var s=!pt((ze||n).memoizedState,a);if(s&&(n.memoizedState=a,Ve=!0),n=n.queue,Ho($c.bind(null,l,n,e),[e]),n.getSnapshot!==t||s||Xe!==null&&Xe.memoizedState.tag&1){if(l.flags|=2048,Cl(9,{destroy:void 0},Jc.bind(null,l,n,a,t),null),Re===null)throw Error(u(349));i||(It&127)!==0||Kc(l,t,a)}return a}function Kc(e,t,a){e.flags|=16384,e={getSnapshot:t,value:a},t=ue.updateQueue,t===null?(t=Ci(),ue.updateQueue=t,t.stores=[e]):(a=t.stores,a===null?t.stores=[e]:a.push(e))}function Jc(e,t,a,l){t.value=a,t.getSnapshot=l,Fc(t)&&Wc(e)}function $c(e,t,a){return a(function(){Fc(t)&&Wc(e)})}function Fc(e){var t=e.getSnapshot;e=e.value;try{var a=t();return!pt(e,a)}catch{return!0}}function Wc(e){var t=Ga(e,2);t!==null&&ft(t,e,2)}function ko(e){var t=at();if(typeof e=="function"){var a=e;if(e=a(),Wa){ca(!0);try{a()}finally{ca(!1)}}}return t.memoizedState=t.baseState=e,t.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:e},t}function Ic(e,t,a,l){return e.baseState=a,Uo(e,ze,typeof l=="function"?l:Pt)}function Mp(e,t,a,l,n){if(Di(e))throw Error(u(485));if(e=t.action,e!==null){var i={payload:n,action:e,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(s){i.listeners.push(s)}};R.T!==null?a(!0):i.isTransition=!1,l(i),a=t.pending,a===null?(i.next=t.pending=i,Pc(t,i)):(i.next=a.next,t.pending=a.next=i)}}function Pc(e,t){var a=t.action,l=t.payload,n=e.state;if(t.isTransition){var i=R.T,s={};R.T=s;try{var d=a(n,l),v=R.S;v!==null&&v(s,d),ef(e,t,d)}catch(T){Lo(e,t,T)}finally{i!==null&&s.types!==null&&(i.types=s.types),R.T=i}}else try{i=a(n,l),ef(e,t,i)}catch(T){Lo(e,t,T)}}function ef(e,t,a){a!==null&&typeof a=="object"&&typeof a.then=="function"?a.then(function(l){tf(e,t,l)},function(l){return Lo(e,t,l)}):tf(e,t,a)}function tf(e,t,a){t.status="fulfilled",t.value=a,af(t),e.state=a,t=e.pending,t!==null&&(a=t.next,a===t?e.pending=null:(a=a.next,t.next=a,Pc(e,a)))}function Lo(e,t,a){var l=e.pending;if(e.pending=null,l!==null){l=l.next;do t.status="rejected",t.reason=a,af(t),t=t.next;while(t!==l)}e.action=null}function af(e){e=e.listeners;for(var t=0;t<e.length;t++)(0,e[t])()}function lf(e,t){return t}function nf(e,t){if(ve){var a=Re.formState;if(a!==null){e:{var l=ue;if(ve){if(Me){t:{for(var n=Me,i=Ct;n.nodeType!==8;){if(!i){n=null;break t}if(n=Rt(n.nextSibling),n===null){n=null;break t}}i=n.data,n=i==="F!"||i==="F"?n:null}if(n){Me=Rt(n.nextSibling),l=n.data==="F!";break e}}pa(l)}l=!1}l&&(t=a[0])}}return a=at(),a.memoizedState=a.baseState=t,l={pending:null,lanes:0,dispatch:null,lastRenderedReducer:lf,lastRenderedState:t},a.queue=l,a=jf.bind(null,ue,l),l.dispatch=a,l=ko(!1),i=Vo.bind(null,ue,!1,l.queue),l=at(),n={state:t,dispatch:null,action:e,pending:null},l.queue=n,a=Mp.bind(null,ue,n,i,a),n.dispatch=a,l.memoizedState=e,[t,a,!1]}function rf(e){var t=Ye();return of(t,ze,e)}function of(e,t,a){if(t=Uo(e,t,lf)[0],e=Ri(Pt)[0],typeof t=="object"&&t!==null&&typeof t.then=="function")try{var l=bn(t)}catch(s){throw s===jl?Si:s}else l=t;t=Ye();var n=t.queue,i=n.dispatch;return a!==t.memoizedState&&(ue.flags|=2048,Cl(9,{destroy:void 0},Dp.bind(null,n,a),null)),[l,i,e]}function Dp(e,t){e.action=t}function sf(e){var t=Ye(),a=ze;if(a!==null)return of(t,a,e);Ye(),t=t.memoizedState,a=Ye();var l=a.queue.dispatch;return a.memoizedState=e,[t,l,!1]}function Cl(e,t,a,l){return e={tag:e,create:a,deps:l,inst:t,next:null},t=ue.updateQueue,t===null&&(t=Ci(),ue.updateQueue=t),a=t.lastEffect,a===null?t.lastEffect=e.next=e:(l=a.next,a.next=e,e.next=l,t.lastEffect=e),e}function uf(){return Ye().memoizedState}function Oi(e,t,a,l){var n=at();ue.flags|=e,n.memoizedState=Cl(1|t,{destroy:void 0},a,l===void 0?null:l)}function Mi(e,t,a,l){var n=Ye();l=l===void 0?null:l;var i=n.memoizedState.inst;ze!==null&&l!==null&&Co(l,ze.memoizedState.deps)?n.memoizedState=Cl(t,i,a,l):(ue.flags|=e,n.memoizedState=Cl(1|t,i,a,l))}function cf(e,t){Oi(8390656,8,e,t)}function Ho(e,t){Mi(2048,8,e,t)}function Up(e){ue.flags|=4;var t=ue.updateQueue;if(t===null)t=Ci(),ue.updateQueue=t,t.events=[e];else{var a=t.events;a===null?t.events=[e]:a.push(e)}}function ff(e){var t=Ye().memoizedState;return Up({ref:t,nextImpl:e}),function(){if((we&2)!==0)throw Error(u(440));return t.impl.apply(void 0,arguments)}}function df(e,t){return Mi(4,2,e,t)}function mf(e,t){return Mi(4,4,e,t)}function hf(e,t){if(typeof t=="function"){e=e();var a=t(e);return function(){typeof a=="function"?a():t(null)}}if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function pf(e,t,a){a=a!=null?a.concat([e]):null,Mi(4,4,hf.bind(null,t,e),a)}function qo(){}function gf(e,t){var a=Ye();t=t===void 0?null:t;var l=a.memoizedState;return t!==null&&Co(t,l[1])?l[0]:(a.memoizedState=[e,t],e)}function vf(e,t){var a=Ye();t=t===void 0?null:t;var l=a.memoizedState;if(t!==null&&Co(t,l[1]))return l[0];if(l=e(),Wa){ca(!0);try{e()}finally{ca(!1)}}return a.memoizedState=[l,t],l}function Yo(e,t,a){return a===void 0||(It&1073741824)!==0&&(pe&261930)===0?e.memoizedState=t:(e.memoizedState=a,e=xd(),ue.lanes|=e,ja|=e,a)}function xf(e,t,a,l){return pt(a,t)?a:Tl.current!==null?(e=Yo(e,a,l),pt(e,t)||(Ve=!0),e):(It&42)===0||(It&1073741824)!==0&&(pe&261930)===0?(Ve=!0,e.memoizedState=a):(e=xd(),ue.lanes|=e,ja|=e,t)}function yf(e,t,a,l,n){var i=X.p;X.p=i!==0&&8>i?i:8;var s=R.T,d={};R.T=d,Vo(e,!1,t,a);try{var v=n(),T=R.S;if(T!==null&&T(d,v),v!==null&&typeof v=="object"&&typeof v.then=="function"){var _=_p(v,l);Sn(e,t,_,St(e))}else Sn(e,t,l,St(e))}catch(M){Sn(e,t,{then:function(){},status:"rejected",reason:M},St())}finally{X.p=i,s!==null&&d.types!==null&&(s.types=d.types),R.T=s}}function Bp(){}function Go(e,t,a,l){if(e.tag!==5)throw Error(u(476));var n=bf(e).queue;yf(e,n,t,ne,a===null?Bp:function(){return Sf(e),a(l)})}function bf(e){var t=e.memoizedState;if(t!==null)return t;t={memoizedState:ne,baseState:ne,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:ne},next:null};var a={};return t.next={memoizedState:a,baseState:a,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:a},next:null},e.memoizedState=t,e=e.alternate,e!==null&&(e.memoizedState=t),t}function Sf(e){var t=bf(e);t.next===null&&(t=e.alternate.memoizedState),Sn(e,t.next.queue,{},St())}function Xo(){return We(Ln)}function wf(){return Ye().memoizedState}function Ef(){return Ye().memoizedState}function kp(e){for(var t=e.return;t!==null;){switch(t.tag){case 24:case 3:var a=St();e=xa(a);var l=ya(t,e,a);l!==null&&(ft(l,t,a),gn(l,t,a)),t={cache:xo()},e.payload=t;return}t=t.return}}function Lp(e,t,a){var l=St();a={lane:l,revertLane:0,gesture:null,action:a,hasEagerState:!1,eagerState:null,next:null},Di(e)?Nf(t,a):(a=ro(e,t,a,l),a!==null&&(ft(a,e,l),Tf(a,t,l)))}function jf(e,t,a){var l=St();Sn(e,t,a,l)}function Sn(e,t,a,l){var n={lane:l,revertLane:0,gesture:null,action:a,hasEagerState:!1,eagerState:null,next:null};if(Di(e))Nf(t,n);else{var i=e.alternate;if(e.lanes===0&&(i===null||i.lanes===0)&&(i=t.lastRenderedReducer,i!==null))try{var s=t.lastRenderedState,d=i(s,a);if(n.hasEagerState=!0,n.eagerState=d,pt(d,s))return hi(e,t,n,0),Re===null&&mi(),!1}catch{}finally{}if(a=ro(e,t,n,l),a!==null)return ft(a,e,l),Tf(a,t,l),!0}return!1}function Vo(e,t,a,l){if(l={lane:2,revertLane:ws(),gesture:null,action:l,hasEagerState:!1,eagerState:null,next:null},Di(e)){if(t)throw Error(u(479))}else t=ro(e,a,l,2),t!==null&&ft(t,e,2)}function Di(e){var t=e.alternate;return e===ue||t!==null&&t===ue}function Nf(e,t){zl=zi=!0;var a=e.pending;a===null?t.next=t:(t.next=a.next,a.next=t),e.pending=t}function Tf(e,t,a){if((a&4194048)!==0){var l=t.lanes;l&=e.pendingLanes,a|=l,t.lanes=a,_u(e,a)}}var wn={readContext:We,use:_i,useCallback:ke,useContext:ke,useEffect:ke,useImperativeHandle:ke,useLayoutEffect:ke,useInsertionEffect:ke,useMemo:ke,useReducer:ke,useRef:ke,useState:ke,useDebugValue:ke,useDeferredValue:ke,useTransition:ke,useSyncExternalStore:ke,useId:ke,useHostTransitionStatus:ke,useFormState:ke,useActionState:ke,useOptimistic:ke,useMemoCache:ke,useCacheRefresh:ke};wn.useEffectEvent=ke;var zf={readContext:We,use:_i,useCallback:function(e,t){return at().memoizedState=[e,t===void 0?null:t],e},useContext:We,useEffect:cf,useImperativeHandle:function(e,t,a){a=a!=null?a.concat([e]):null,Oi(4194308,4,hf.bind(null,t,e),a)},useLayoutEffect:function(e,t){return Oi(4194308,4,e,t)},useInsertionEffect:function(e,t){Oi(4,2,e,t)},useMemo:function(e,t){var a=at();t=t===void 0?null:t;var l=e();if(Wa){ca(!0);try{e()}finally{ca(!1)}}return a.memoizedState=[l,t],l},useReducer:function(e,t,a){var l=at();if(a!==void 0){var n=a(t);if(Wa){ca(!0);try{a(t)}finally{ca(!1)}}}else n=t;return l.memoizedState=l.baseState=n,e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:n},l.queue=e,e=e.dispatch=Lp.bind(null,ue,e),[l.memoizedState,e]},useRef:function(e){var t=at();return e={current:e},t.memoizedState=e},useState:function(e){e=ko(e);var t=e.queue,a=jf.bind(null,ue,t);return t.dispatch=a,[e.memoizedState,a]},useDebugValue:qo,useDeferredValue:function(e,t){var a=at();return Yo(a,e,t)},useTransition:function(){var e=ko(!1);return e=yf.bind(null,ue,e.queue,!0,!1),at().memoizedState=e,[!1,e]},useSyncExternalStore:function(e,t,a){var l=ue,n=at();if(ve){if(a===void 0)throw Error(u(407));a=a()}else{if(a=t(),Re===null)throw Error(u(349));(pe&127)!==0||Kc(l,t,a)}n.memoizedState=a;var i={value:a,getSnapshot:t};return n.queue=i,cf($c.bind(null,l,i,e),[e]),l.flags|=2048,Cl(9,{destroy:void 0},Jc.bind(null,l,i,a,t),null),a},useId:function(){var e=at(),t=Re.identifierPrefix;if(ve){var a=qt,l=Ht;a=(l&~(1<<32-ht(l)-1)).toString(32)+a,t="_"+t+"R_"+a,a=Ai++,0<a&&(t+="H"+a.toString(32)),t+="_"}else a=Rp++,t="_"+t+"r_"+a.toString(32)+"_";return e.memoizedState=t},useHostTransitionStatus:Xo,useFormState:nf,useActionState:nf,useOptimistic:function(e){var t=at();t.memoizedState=t.baseState=e;var a={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return t.queue=a,t=Vo.bind(null,ue,!0,a),a.dispatch=t,[e,t]},useMemoCache:Do,useCacheRefresh:function(){return at().memoizedState=kp.bind(null,ue)},useEffectEvent:function(e){var t=at(),a={impl:e};return t.memoizedState=a,function(){if((we&2)!==0)throw Error(u(440));return a.impl.apply(void 0,arguments)}}},Qo={readContext:We,use:_i,useCallback:gf,useContext:We,useEffect:Ho,useImperativeHandle:pf,useInsertionEffect:df,useLayoutEffect:mf,useMemo:vf,useReducer:Ri,useRef:uf,useState:function(){return Ri(Pt)},useDebugValue:qo,useDeferredValue:function(e,t){var a=Ye();return xf(a,ze.memoizedState,e,t)},useTransition:function(){var e=Ri(Pt)[0],t=Ye().memoizedState;return[typeof e=="boolean"?e:bn(e),t]},useSyncExternalStore:Zc,useId:wf,useHostTransitionStatus:Xo,useFormState:rf,useActionState:rf,useOptimistic:function(e,t){var a=Ye();return Ic(a,ze,e,t)},useMemoCache:Do,useCacheRefresh:Ef};Qo.useEffectEvent=ff;var Af={readContext:We,use:_i,useCallback:gf,useContext:We,useEffect:Ho,useImperativeHandle:pf,useInsertionEffect:df,useLayoutEffect:mf,useMemo:vf,useReducer:Bo,useRef:uf,useState:function(){return Bo(Pt)},useDebugValue:qo,useDeferredValue:function(e,t){var a=Ye();return ze===null?Yo(a,e,t):xf(a,ze.memoizedState,e,t)},useTransition:function(){var e=Bo(Pt)[0],t=Ye().memoizedState;return[typeof e=="boolean"?e:bn(e),t]},useSyncExternalStore:Zc,useId:wf,useHostTransitionStatus:Xo,useFormState:sf,useActionState:sf,useOptimistic:function(e,t){var a=Ye();return ze!==null?Ic(a,ze,e,t):(a.baseState=e,[e,a.queue.dispatch])},useMemoCache:Do,useCacheRefresh:Ef};Af.useEffectEvent=ff;function Zo(e,t,a,l){t=e.memoizedState,a=a(l,t),a=a==null?t:E({},t,a),e.memoizedState=a,e.lanes===0&&(e.updateQueue.baseState=a)}var Ko={enqueueSetState:function(e,t,a){e=e._reactInternals;var l=St(),n=xa(l);n.payload=t,a!=null&&(n.callback=a),t=ya(e,n,l),t!==null&&(ft(t,e,l),gn(t,e,l))},enqueueReplaceState:function(e,t,a){e=e._reactInternals;var l=St(),n=xa(l);n.tag=1,n.payload=t,a!=null&&(n.callback=a),t=ya(e,n,l),t!==null&&(ft(t,e,l),gn(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var a=St(),l=xa(a);l.tag=2,t!=null&&(l.callback=t),t=ya(e,l,a),t!==null&&(ft(t,e,a),gn(t,e,a))}};function Cf(e,t,a,l,n,i,s){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(l,i,s):t.prototype&&t.prototype.isPureReactComponent?!sn(a,l)||!sn(n,i):!0}function _f(e,t,a,l){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(a,l),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(a,l),t.state!==e&&Ko.enqueueReplaceState(t,t.state,null)}function Ia(e,t){var a=t;if("ref"in t){a={};for(var l in t)l!=="ref"&&(a[l]=t[l])}if(e=e.defaultProps){a===t&&(a=E({},a));for(var n in e)a[n]===void 0&&(a[n]=e[n])}return a}function Rf(e){di(e)}function Of(e){console.error(e)}function Mf(e){di(e)}function Ui(e,t){try{var a=e.onUncaughtError;a(t.value,{componentStack:t.stack})}catch(l){setTimeout(function(){throw l})}}function Df(e,t,a){try{var l=e.onCaughtError;l(a.value,{componentStack:a.stack,errorBoundary:t.tag===1?t.stateNode:null})}catch(n){setTimeout(function(){throw n})}}function Jo(e,t,a){return a=xa(a),a.tag=3,a.payload={element:null},a.callback=function(){Ui(e,t)},a}function Uf(e){return e=xa(e),e.tag=3,e}function Bf(e,t,a,l){var n=a.type.getDerivedStateFromError;if(typeof n=="function"){var i=l.value;e.payload=function(){return n(i)},e.callback=function(){Df(t,a,l)}}var s=a.stateNode;s!==null&&typeof s.componentDidCatch=="function"&&(e.callback=function(){Df(t,a,l),typeof n!="function"&&(Na===null?Na=new Set([this]):Na.add(this));var d=l.stack;this.componentDidCatch(l.value,{componentStack:d!==null?d:""})})}function Hp(e,t,a,l,n){if(a.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){if(t=a.alternate,t!==null&&Sl(t,a,n,!0),a=vt.current,a!==null){switch(a.tag){case 31:case 13:return _t===null?Ki():a.alternate===null&&Le===0&&(Le=3),a.flags&=-257,a.flags|=65536,a.lanes=n,l===wi?a.flags|=16384:(t=a.updateQueue,t===null?a.updateQueue=new Set([l]):t.add(l),ys(e,l,n)),!1;case 22:return a.flags|=65536,l===wi?a.flags|=16384:(t=a.updateQueue,t===null?(t={transitions:null,markerInstances:null,retryQueue:new Set([l])},a.updateQueue=t):(a=t.retryQueue,a===null?t.retryQueue=new Set([l]):a.add(l)),ys(e,l,n)),!1}throw Error(u(435,a.tag))}return ys(e,l,n),Ki(),!1}if(ve)return t=vt.current,t!==null?((t.flags&65536)===0&&(t.flags|=256),t.flags|=65536,t.lanes=n,l!==mo&&(e=Error(u(422),{cause:l}),fn(Tt(e,a)))):(l!==mo&&(t=Error(u(423),{cause:l}),fn(Tt(t,a))),e=e.current.alternate,e.flags|=65536,n&=-n,e.lanes|=n,l=Tt(l,a),n=Jo(e.stateNode,l,n),jo(e,n),Le!==4&&(Le=2)),!1;var i=Error(u(520),{cause:l});if(i=Tt(i,a),_n===null?_n=[i]:_n.push(i),Le!==4&&(Le=2),t===null)return!0;l=Tt(l,a),a=t;do{switch(a.tag){case 3:return a.flags|=65536,e=n&-n,a.lanes|=e,e=Jo(a.stateNode,l,e),jo(a,e),!1;case 1:if(t=a.type,i=a.stateNode,(a.flags&128)===0&&(typeof t.getDerivedStateFromError=="function"||i!==null&&typeof i.componentDidCatch=="function"&&(Na===null||!Na.has(i))))return a.flags|=65536,n&=-n,a.lanes|=n,n=Uf(n),Bf(n,e,a,l),jo(a,n),!1}a=a.return}while(a!==null);return!1}var $o=Error(u(461)),Ve=!1;function Ie(e,t,a,l){t.child=e===null?Hc(t,null,a,l):Fa(t,e.child,a,l)}function kf(e,t,a,l,n){a=a.render;var i=t.ref;if("ref"in l){var s={};for(var d in l)d!=="ref"&&(s[d]=l[d])}else s=l;return Za(t),l=_o(e,t,a,s,i,n),d=Ro(),e!==null&&!Ve?(Oo(e,t,n),ea(e,t,n)):(ve&&d&&co(t),t.flags|=1,Ie(e,t,l,n),t.child)}function Lf(e,t,a,l,n){if(e===null){var i=a.type;return typeof i=="function"&&!oo(i)&&i.defaultProps===void 0&&a.compare===null?(t.tag=15,t.type=i,Hf(e,t,i,l,n)):(e=gi(a.type,null,l,t,t.mode,n),e.ref=t.ref,e.return=t,t.child=e)}if(i=e.child,!ls(e,n)){var s=i.memoizedProps;if(a=a.compare,a=a!==null?a:sn,a(s,l)&&e.ref===t.ref)return ea(e,t,n)}return t.flags|=1,e=Jt(i,l),e.ref=t.ref,e.return=t,t.child=e}function Hf(e,t,a,l,n){if(e!==null){var i=e.memoizedProps;if(sn(i,l)&&e.ref===t.ref)if(Ve=!1,t.pendingProps=l=i,ls(e,n))(e.flags&131072)!==0&&(Ve=!0);else return t.lanes=e.lanes,ea(e,t,n)}return Fo(e,t,a,l,n)}function qf(e,t,a,l){var n=l.children,i=e!==null?e.memoizedState:null;if(e===null&&t.stateNode===null&&(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),l.mode==="hidden"){if((t.flags&128)!==0){if(i=i!==null?i.baseLanes|a:a,e!==null){for(l=t.child=e.child,n=0;l!==null;)n=n|l.lanes|l.childLanes,l=l.sibling;l=n&~i}else l=0,t.child=null;return Yf(e,t,i,a,l)}if((a&536870912)!==0)t.memoizedState={baseLanes:0,cachePool:null},e!==null&&bi(t,i!==null?i.cachePool:null),i!==null?Gc(t,i):To(),Xc(t);else return l=t.lanes=536870912,Yf(e,t,i!==null?i.baseLanes|a:a,a,l)}else i!==null?(bi(t,i.cachePool),Gc(t,i),Sa(),t.memoizedState=null):(e!==null&&bi(t,null),To(),Sa());return Ie(e,t,n,a),t.child}function En(e,t){return e!==null&&e.tag===22||t.stateNode!==null||(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),t.sibling}function Yf(e,t,a,l,n){var i=bo();return i=i===null?null:{parent:Ge._currentValue,pool:i},t.memoizedState={baseLanes:a,cachePool:i},e!==null&&bi(t,null),To(),Xc(t),e!==null&&Sl(e,t,l,!0),t.childLanes=n,null}function Bi(e,t){return t=Li({mode:t.mode,children:t.children},e.mode),t.ref=e.ref,e.child=t,t.return=e,t}function Gf(e,t,a){return Fa(t,e.child,null,a),e=Bi(t,t.pendingProps),e.flags|=2,xt(t),t.memoizedState=null,e}function qp(e,t,a){var l=t.pendingProps,n=(t.flags&128)!==0;if(t.flags&=-129,e===null){if(ve){if(l.mode==="hidden")return e=Bi(t,l),t.lanes=536870912,En(null,e);if(Ao(t),(e=Me)?(e=em(e,Ct),e=e!==null&&e.data==="&"?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:ma!==null?{id:Ht,overflow:qt}:null,retryLane:536870912,hydrationErrors:null},a=jc(e),a.return=t,t.child=a,Fe=t,Me=null)):e=null,e===null)throw pa(t);return t.lanes=536870912,null}return Bi(t,l)}var i=e.memoizedState;if(i!==null){var s=i.dehydrated;if(Ao(t),n)if(t.flags&256)t.flags&=-257,t=Gf(e,t,a);else if(t.memoizedState!==null)t.child=e.child,t.flags|=128,t=null;else throw Error(u(558));else if(Ve||Sl(e,t,a,!1),n=(a&e.childLanes)!==0,Ve||n){if(l=Re,l!==null&&(s=Ru(l,a),s!==0&&s!==i.retryLane))throw i.retryLane=s,Ga(e,s),ft(l,e,s),$o;Ki(),t=Gf(e,t,a)}else e=i.treeContext,Me=Rt(s.nextSibling),Fe=t,ve=!0,ha=null,Ct=!1,e!==null&&zc(t,e),t=Bi(t,l),t.flags|=4096;return t}return e=Jt(e.child,{mode:l.mode,children:l.children}),e.ref=t.ref,t.child=e,e.return=t,e}function ki(e,t){var a=t.ref;if(a===null)e!==null&&e.ref!==null&&(t.flags|=4194816);else{if(typeof a!="function"&&typeof a!="object")throw Error(u(284));(e===null||e.ref!==a)&&(t.flags|=4194816)}}function Fo(e,t,a,l,n){return Za(t),a=_o(e,t,a,l,void 0,n),l=Ro(),e!==null&&!Ve?(Oo(e,t,n),ea(e,t,n)):(ve&&l&&co(t),t.flags|=1,Ie(e,t,a,n),t.child)}function Xf(e,t,a,l,n,i){return Za(t),t.updateQueue=null,a=Qc(t,l,a,n),Vc(e),l=Ro(),e!==null&&!Ve?(Oo(e,t,i),ea(e,t,i)):(ve&&l&&co(t),t.flags|=1,Ie(e,t,a,i),t.child)}function Vf(e,t,a,l,n){if(Za(t),t.stateNode===null){var i=vl,s=a.contextType;typeof s=="object"&&s!==null&&(i=We(s)),i=new a(l,i),t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,i.updater=Ko,t.stateNode=i,i._reactInternals=t,i=t.stateNode,i.props=l,i.state=t.memoizedState,i.refs={},wo(t),s=a.contextType,i.context=typeof s=="object"&&s!==null?We(s):vl,i.state=t.memoizedState,s=a.getDerivedStateFromProps,typeof s=="function"&&(Zo(t,a,s,l),i.state=t.memoizedState),typeof a.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(s=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),s!==i.state&&Ko.enqueueReplaceState(i,i.state,null),xn(t,l,i,n),vn(),i.state=t.memoizedState),typeof i.componentDidMount=="function"&&(t.flags|=4194308),l=!0}else if(e===null){i=t.stateNode;var d=t.memoizedProps,v=Ia(a,d);i.props=v;var T=i.context,_=a.contextType;s=vl,typeof _=="object"&&_!==null&&(s=We(_));var M=a.getDerivedStateFromProps;_=typeof M=="function"||typeof i.getSnapshotBeforeUpdate=="function",d=t.pendingProps!==d,_||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(d||T!==s)&&_f(t,i,l,s),va=!1;var A=t.memoizedState;i.state=A,xn(t,l,i,n),vn(),T=t.memoizedState,d||A!==T||va?(typeof M=="function"&&(Zo(t,a,M,l),T=t.memoizedState),(v=va||Cf(t,a,v,l,A,T,s))?(_||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount()),typeof i.componentDidMount=="function"&&(t.flags|=4194308)):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=l,t.memoizedState=T),i.props=l,i.state=T,i.context=s,l=v):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),l=!1)}else{i=t.stateNode,Eo(e,t),s=t.memoizedProps,_=Ia(a,s),i.props=_,M=t.pendingProps,A=i.context,T=a.contextType,v=vl,typeof T=="object"&&T!==null&&(v=We(T)),d=a.getDerivedStateFromProps,(T=typeof d=="function"||typeof i.getSnapshotBeforeUpdate=="function")||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(s!==M||A!==v)&&_f(t,i,l,v),va=!1,A=t.memoizedState,i.state=A,xn(t,l,i,n),vn();var C=t.memoizedState;s!==M||A!==C||va||e!==null&&e.dependencies!==null&&xi(e.dependencies)?(typeof d=="function"&&(Zo(t,a,d,l),C=t.memoizedState),(_=va||Cf(t,a,_,l,A,C,v)||e!==null&&e.dependencies!==null&&xi(e.dependencies))?(T||typeof i.UNSAFE_componentWillUpdate!="function"&&typeof i.componentWillUpdate!="function"||(typeof i.componentWillUpdate=="function"&&i.componentWillUpdate(l,C,v),typeof i.UNSAFE_componentWillUpdate=="function"&&i.UNSAFE_componentWillUpdate(l,C,v)),typeof i.componentDidUpdate=="function"&&(t.flags|=4),typeof i.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof i.componentDidUpdate!="function"||s===e.memoizedProps&&A===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||s===e.memoizedProps&&A===e.memoizedState||(t.flags|=1024),t.memoizedProps=l,t.memoizedState=C),i.props=l,i.state=C,i.context=v,l=_):(typeof i.componentDidUpdate!="function"||s===e.memoizedProps&&A===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||s===e.memoizedProps&&A===e.memoizedState||(t.flags|=1024),l=!1)}return i=l,ki(e,t),l=(t.flags&128)!==0,i||l?(i=t.stateNode,a=l&&typeof a.getDerivedStateFromError!="function"?null:i.render(),t.flags|=1,e!==null&&l?(t.child=Fa(t,e.child,null,n),t.child=Fa(t,null,a,n)):Ie(e,t,a,n),t.memoizedState=i.state,e=t.child):e=ea(e,t,n),e}function Qf(e,t,a,l){return Va(),t.flags|=256,Ie(e,t,a,l),t.child}var Wo={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function Io(e){return{baseLanes:e,cachePool:Mc()}}function Po(e,t,a){return e=e!==null?e.childLanes&~a:0,t&&(e|=bt),e}function Zf(e,t,a){var l=t.pendingProps,n=!1,i=(t.flags&128)!==0,s;if((s=i)||(s=e!==null&&e.memoizedState===null?!1:(qe.current&2)!==0),s&&(n=!0,t.flags&=-129),s=(t.flags&32)!==0,t.flags&=-33,e===null){if(ve){if(n?ba(t):Sa(),(e=Me)?(e=em(e,Ct),e=e!==null&&e.data!=="&"?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:ma!==null?{id:Ht,overflow:qt}:null,retryLane:536870912,hydrationErrors:null},a=jc(e),a.return=t,t.child=a,Fe=t,Me=null)):e=null,e===null)throw pa(t);return Us(e)?t.lanes=32:t.lanes=536870912,null}var d=l.children;return l=l.fallback,n?(Sa(),n=t.mode,d=Li({mode:"hidden",children:d},n),l=Xa(l,n,a,null),d.return=t,l.return=t,d.sibling=l,t.child=d,l=t.child,l.memoizedState=Io(a),l.childLanes=Po(e,s,a),t.memoizedState=Wo,En(null,l)):(ba(t),es(t,d))}var v=e.memoizedState;if(v!==null&&(d=v.dehydrated,d!==null)){if(i)t.flags&256?(ba(t),t.flags&=-257,t=ts(e,t,a)):t.memoizedState!==null?(Sa(),t.child=e.child,t.flags|=128,t=null):(Sa(),d=l.fallback,n=t.mode,l=Li({mode:"visible",children:l.children},n),d=Xa(d,n,a,null),d.flags|=2,l.return=t,d.return=t,l.sibling=d,t.child=l,Fa(t,e.child,null,a),l=t.child,l.memoizedState=Io(a),l.childLanes=Po(e,s,a),t.memoizedState=Wo,t=En(null,l));else if(ba(t),Us(d)){if(s=d.nextSibling&&d.nextSibling.dataset,s)var T=s.dgst;s=T,l=Error(u(419)),l.stack="",l.digest=s,fn({value:l,source:null,stack:null}),t=ts(e,t,a)}else if(Ve||Sl(e,t,a,!1),s=(a&e.childLanes)!==0,Ve||s){if(s=Re,s!==null&&(l=Ru(s,a),l!==0&&l!==v.retryLane))throw v.retryLane=l,Ga(e,l),ft(s,e,l),$o;Ds(d)||Ki(),t=ts(e,t,a)}else Ds(d)?(t.flags|=192,t.child=e.child,t=null):(e=v.treeContext,Me=Rt(d.nextSibling),Fe=t,ve=!0,ha=null,Ct=!1,e!==null&&zc(t,e),t=es(t,l.children),t.flags|=4096);return t}return n?(Sa(),d=l.fallback,n=t.mode,v=e.child,T=v.sibling,l=Jt(v,{mode:"hidden",children:l.children}),l.subtreeFlags=v.subtreeFlags&65011712,T!==null?d=Jt(T,d):(d=Xa(d,n,a,null),d.flags|=2),d.return=t,l.return=t,l.sibling=d,t.child=l,En(null,l),l=t.child,d=e.child.memoizedState,d===null?d=Io(a):(n=d.cachePool,n!==null?(v=Ge._currentValue,n=n.parent!==v?{parent:v,pool:v}:n):n=Mc(),d={baseLanes:d.baseLanes|a,cachePool:n}),l.memoizedState=d,l.childLanes=Po(e,s,a),t.memoizedState=Wo,En(e.child,l)):(ba(t),a=e.child,e=a.sibling,a=Jt(a,{mode:"visible",children:l.children}),a.return=t,a.sibling=null,e!==null&&(s=t.deletions,s===null?(t.deletions=[e],t.flags|=16):s.push(e)),t.child=a,t.memoizedState=null,a)}function es(e,t){return t=Li({mode:"visible",children:t},e.mode),t.return=e,e.child=t}function Li(e,t){return e=gt(22,e,null,t),e.lanes=0,e}function ts(e,t,a){return Fa(t,e.child,null,a),e=es(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Kf(e,t,a){e.lanes|=t;var l=e.alternate;l!==null&&(l.lanes|=t),go(e.return,t,a)}function as(e,t,a,l,n,i){var s=e.memoizedState;s===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:l,tail:a,tailMode:n,treeForkCount:i}:(s.isBackwards=t,s.rendering=null,s.renderingStartTime=0,s.last=l,s.tail=a,s.tailMode=n,s.treeForkCount=i)}function Jf(e,t,a){var l=t.pendingProps,n=l.revealOrder,i=l.tail;l=l.children;var s=qe.current,d=(s&2)!==0;if(d?(s=s&1|2,t.flags|=128):s&=1,Q(qe,s),Ie(e,t,l,a),l=ve?cn:0,!d&&e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Kf(e,a,t);else if(e.tag===19)Kf(e,a,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}switch(n){case"forwards":for(a=t.child,n=null;a!==null;)e=a.alternate,e!==null&&Ti(e)===null&&(n=a),a=a.sibling;a=n,a===null?(n=t.child,t.child=null):(n=a.sibling,a.sibling=null),as(t,!1,n,a,i,l);break;case"backwards":case"unstable_legacy-backwards":for(a=null,n=t.child,t.child=null;n!==null;){if(e=n.alternate,e!==null&&Ti(e)===null){t.child=n;break}e=n.sibling,n.sibling=a,a=n,n=e}as(t,!0,a,null,i,l);break;case"together":as(t,!1,null,null,void 0,l);break;default:t.memoizedState=null}return t.child}function ea(e,t,a){if(e!==null&&(t.dependencies=e.dependencies),ja|=t.lanes,(a&t.childLanes)===0)if(e!==null){if(Sl(e,t,a,!1),(a&t.childLanes)===0)return null}else return null;if(e!==null&&t.child!==e.child)throw Error(u(153));if(t.child!==null){for(e=t.child,a=Jt(e,e.pendingProps),t.child=a,a.return=t;e.sibling!==null;)e=e.sibling,a=a.sibling=Jt(e,e.pendingProps),a.return=t;a.sibling=null}return t.child}function ls(e,t){return(e.lanes&t)!==0?!0:(e=e.dependencies,!!(e!==null&&xi(e)))}function Yp(e,t,a){switch(t.tag){case 3:tt(t,t.stateNode.containerInfo),ga(t,Ge,e.memoizedState.cache),Va();break;case 27:case 5:Jl(t);break;case 4:tt(t,t.stateNode.containerInfo);break;case 10:ga(t,t.type,t.memoizedProps.value);break;case 31:if(t.memoizedState!==null)return t.flags|=128,Ao(t),null;break;case 13:var l=t.memoizedState;if(l!==null)return l.dehydrated!==null?(ba(t),t.flags|=128,null):(a&t.child.childLanes)!==0?Zf(e,t,a):(ba(t),e=ea(e,t,a),e!==null?e.sibling:null);ba(t);break;case 19:var n=(e.flags&128)!==0;if(l=(a&t.childLanes)!==0,l||(Sl(e,t,a,!1),l=(a&t.childLanes)!==0),n){if(l)return Jf(e,t,a);t.flags|=128}if(n=t.memoizedState,n!==null&&(n.rendering=null,n.tail=null,n.lastEffect=null),Q(qe,qe.current),l)break;return null;case 22:return t.lanes=0,qf(e,t,a,t.pendingProps);case 24:ga(t,Ge,e.memoizedState.cache)}return ea(e,t,a)}function $f(e,t,a){if(e!==null)if(e.memoizedProps!==t.pendingProps)Ve=!0;else{if(!ls(e,a)&&(t.flags&128)===0)return Ve=!1,Yp(e,t,a);Ve=(e.flags&131072)!==0}else Ve=!1,ve&&(t.flags&1048576)!==0&&Tc(t,cn,t.index);switch(t.lanes=0,t.tag){case 16:e:{var l=t.pendingProps;if(e=Ja(t.elementType),t.type=e,typeof e=="function")oo(e)?(l=Ia(e,l),t.tag=1,t=Vf(null,t,e,l,a)):(t.tag=0,t=Fo(null,t,e,l,a));else{if(e!=null){var n=e.$$typeof;if(n===F){t.tag=11,t=kf(null,t,e,l,a);break e}else if(n===G){t.tag=14,t=Lf(null,t,e,l,a);break e}}throw t=he(e)||e,Error(u(306,t,""))}}return t;case 0:return Fo(e,t,t.type,t.pendingProps,a);case 1:return l=t.type,n=Ia(l,t.pendingProps),Vf(e,t,l,n,a);case 3:e:{if(tt(t,t.stateNode.containerInfo),e===null)throw Error(u(387));l=t.pendingProps;var i=t.memoizedState;n=i.element,Eo(e,t),xn(t,l,null,a);var s=t.memoizedState;if(l=s.cache,ga(t,Ge,l),l!==i.cache&&vo(t,[Ge],a,!0),vn(),l=s.element,i.isDehydrated)if(i={element:l,isDehydrated:!1,cache:s.cache},t.updateQueue.baseState=i,t.memoizedState=i,t.flags&256){t=Qf(e,t,l,a);break e}else if(l!==n){n=Tt(Error(u(424)),t),fn(n),t=Qf(e,t,l,a);break e}else{switch(e=t.stateNode.containerInfo,e.nodeType){case 9:e=e.body;break;default:e=e.nodeName==="HTML"?e.ownerDocument.body:e}for(Me=Rt(e.firstChild),Fe=t,ve=!0,ha=null,Ct=!0,a=Hc(t,null,l,a),t.child=a;a;)a.flags=a.flags&-3|4096,a=a.sibling}else{if(Va(),l===n){t=ea(e,t,a);break e}Ie(e,t,l,a)}t=t.child}return t;case 26:return ki(e,t),e===null?(a=rm(t.type,null,t.pendingProps,null))?t.memoizedState=a:ve||(a=t.type,e=t.pendingProps,l=er(fe.current).createElement(a),l[$e]=t,l[it]=e,Pe(l,a,e),Ke(l),t.stateNode=l):t.memoizedState=rm(t.type,e.memoizedProps,t.pendingProps,e.memoizedState),null;case 27:return Jl(t),e===null&&ve&&(l=t.stateNode=lm(t.type,t.pendingProps,fe.current),Fe=t,Ct=!0,n=Me,Ca(t.type)?(Bs=n,Me=Rt(l.firstChild)):Me=n),Ie(e,t,t.pendingProps.children,a),ki(e,t),e===null&&(t.flags|=4194304),t.child;case 5:return e===null&&ve&&((n=l=Me)&&(l=vg(l,t.type,t.pendingProps,Ct),l!==null?(t.stateNode=l,Fe=t,Me=Rt(l.firstChild),Ct=!1,n=!0):n=!1),n||pa(t)),Jl(t),n=t.type,i=t.pendingProps,s=e!==null?e.memoizedProps:null,l=i.children,Rs(n,i)?l=null:s!==null&&Rs(n,s)&&(t.flags|=32),t.memoizedState!==null&&(n=_o(e,t,Op,null,null,a),Ln._currentValue=n),ki(e,t),Ie(e,t,l,a),t.child;case 6:return e===null&&ve&&((e=a=Me)&&(a=xg(a,t.pendingProps,Ct),a!==null?(t.stateNode=a,Fe=t,Me=null,e=!0):e=!1),e||pa(t)),null;case 13:return Zf(e,t,a);case 4:return tt(t,t.stateNode.containerInfo),l=t.pendingProps,e===null?t.child=Fa(t,null,l,a):Ie(e,t,l,a),t.child;case 11:return kf(e,t,t.type,t.pendingProps,a);case 7:return Ie(e,t,t.pendingProps,a),t.child;case 8:return Ie(e,t,t.pendingProps.children,a),t.child;case 12:return Ie(e,t,t.pendingProps.children,a),t.child;case 10:return l=t.pendingProps,ga(t,t.type,l.value),Ie(e,t,l.children,a),t.child;case 9:return n=t.type._context,l=t.pendingProps.children,Za(t),n=We(n),l=l(n),t.flags|=1,Ie(e,t,l,a),t.child;case 14:return Lf(e,t,t.type,t.pendingProps,a);case 15:return Hf(e,t,t.type,t.pendingProps,a);case 19:return Jf(e,t,a);case 31:return qp(e,t,a);case 22:return qf(e,t,a,t.pendingProps);case 24:return Za(t),l=We(Ge),e===null?(n=bo(),n===null&&(n=Re,i=xo(),n.pooledCache=i,i.refCount++,i!==null&&(n.pooledCacheLanes|=a),n=i),t.memoizedState={parent:l,cache:n},wo(t),ga(t,Ge,n)):((e.lanes&a)!==0&&(Eo(e,t),xn(t,null,null,a),vn()),n=e.memoizedState,i=t.memoizedState,n.parent!==l?(n={parent:l,cache:l},t.memoizedState=n,t.lanes===0&&(t.memoizedState=t.updateQueue.baseState=n),ga(t,Ge,l)):(l=i.cache,ga(t,Ge,l),l!==n.cache&&vo(t,[Ge],a,!0))),Ie(e,t,t.pendingProps.children,a),t.child;case 29:throw t.pendingProps}throw Error(u(156,t.tag))}function ta(e){e.flags|=4}function ns(e,t,a,l,n){if((t=(e.mode&32)!==0)&&(t=!1),t){if(e.flags|=16777216,(n&335544128)===n)if(e.stateNode.complete)e.flags|=8192;else if(wd())e.flags|=8192;else throw $a=wi,So}else e.flags&=-16777217}function Ff(e,t){if(t.type!=="stylesheet"||(t.state.loading&4)!==0)e.flags&=-16777217;else if(e.flags|=16777216,!fm(t))if(wd())e.flags|=8192;else throw $a=wi,So}function Hi(e,t){t!==null&&(e.flags|=4),e.flags&16384&&(t=e.tag!==22?Au():536870912,e.lanes|=t,Ml|=t)}function jn(e,t){if(!ve)switch(e.tailMode){case"hidden":t=e.tail;for(var a=null;t!==null;)t.alternate!==null&&(a=t),t=t.sibling;a===null?e.tail=null:a.sibling=null;break;case"collapsed":a=e.tail;for(var l=null;a!==null;)a.alternate!==null&&(l=a),a=a.sibling;l===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:l.sibling=null}}function De(e){var t=e.alternate!==null&&e.alternate.child===e.child,a=0,l=0;if(t)for(var n=e.child;n!==null;)a|=n.lanes|n.childLanes,l|=n.subtreeFlags&65011712,l|=n.flags&65011712,n.return=e,n=n.sibling;else for(n=e.child;n!==null;)a|=n.lanes|n.childLanes,l|=n.subtreeFlags,l|=n.flags,n.return=e,n=n.sibling;return e.subtreeFlags|=l,e.childLanes=a,t}function Gp(e,t,a){var l=t.pendingProps;switch(fo(t),t.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return De(t),null;case 1:return De(t),null;case 3:return a=t.stateNode,l=null,e!==null&&(l=e.memoizedState.cache),t.memoizedState.cache!==l&&(t.flags|=2048),Wt(Ge),He(),a.pendingContext&&(a.context=a.pendingContext,a.pendingContext=null),(e===null||e.child===null)&&(bl(t)?ta(t):e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,ho())),De(t),null;case 26:var n=t.type,i=t.memoizedState;return e===null?(ta(t),i!==null?(De(t),Ff(t,i)):(De(t),ns(t,n,null,l,a))):i?i!==e.memoizedState?(ta(t),De(t),Ff(t,i)):(De(t),t.flags&=-16777217):(e=e.memoizedProps,e!==l&&ta(t),De(t),ns(t,n,e,l,a)),null;case 27:if(Fn(t),a=fe.current,n=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==l&&ta(t);else{if(!l){if(t.stateNode===null)throw Error(u(166));return De(t),null}e=I.current,bl(t)?Ac(t):(e=lm(n,l,a),t.stateNode=e,ta(t))}return De(t),null;case 5:if(Fn(t),n=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==l&&ta(t);else{if(!l){if(t.stateNode===null)throw Error(u(166));return De(t),null}if(i=I.current,bl(t))Ac(t);else{var s=er(fe.current);switch(i){case 1:i=s.createElementNS("http://www.w3.org/2000/svg",n);break;case 2:i=s.createElementNS("http://www.w3.org/1998/Math/MathML",n);break;default:switch(n){case"svg":i=s.createElementNS("http://www.w3.org/2000/svg",n);break;case"math":i=s.createElementNS("http://www.w3.org/1998/Math/MathML",n);break;case"script":i=s.createElement("div"),i.innerHTML="<script><\/script>",i=i.removeChild(i.firstChild);break;case"select":i=typeof l.is=="string"?s.createElement("select",{is:l.is}):s.createElement("select"),l.multiple?i.multiple=!0:l.size&&(i.size=l.size);break;default:i=typeof l.is=="string"?s.createElement(n,{is:l.is}):s.createElement(n)}}i[$e]=t,i[it]=l;e:for(s=t.child;s!==null;){if(s.tag===5||s.tag===6)i.appendChild(s.stateNode);else if(s.tag!==4&&s.tag!==27&&s.child!==null){s.child.return=s,s=s.child;continue}if(s===t)break e;for(;s.sibling===null;){if(s.return===null||s.return===t)break e;s=s.return}s.sibling.return=s.return,s=s.sibling}t.stateNode=i;e:switch(Pe(i,n,l),n){case"button":case"input":case"select":case"textarea":l=!!l.autoFocus;break e;case"img":l=!0;break e;default:l=!1}l&&ta(t)}}return De(t),ns(t,t.type,e===null?null:e.memoizedProps,t.pendingProps,a),null;case 6:if(e&&t.stateNode!=null)e.memoizedProps!==l&&ta(t);else{if(typeof l!="string"&&t.stateNode===null)throw Error(u(166));if(e=fe.current,bl(t)){if(e=t.stateNode,a=t.memoizedProps,l=null,n=Fe,n!==null)switch(n.tag){case 27:case 5:l=n.memoizedProps}e[$e]=t,e=!!(e.nodeValue===a||l!==null&&l.suppressHydrationWarning===!0||Zd(e.nodeValue,a)),e||pa(t,!0)}else e=er(e).createTextNode(l),e[$e]=t,t.stateNode=e}return De(t),null;case 31:if(a=t.memoizedState,e===null||e.memoizedState!==null){if(l=bl(t),a!==null){if(e===null){if(!l)throw Error(u(318));if(e=t.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(u(557));e[$e]=t}else Va(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;De(t),e=!1}else a=ho(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=a),e=!0;if(!e)return t.flags&256?(xt(t),t):(xt(t),null);if((t.flags&128)!==0)throw Error(u(558))}return De(t),null;case 13:if(l=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(n=bl(t),l!==null&&l.dehydrated!==null){if(e===null){if(!n)throw Error(u(318));if(n=t.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(u(317));n[$e]=t}else Va(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;De(t),n=!1}else n=ho(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=n),n=!0;if(!n)return t.flags&256?(xt(t),t):(xt(t),null)}return xt(t),(t.flags&128)!==0?(t.lanes=a,t):(a=l!==null,e=e!==null&&e.memoizedState!==null,a&&(l=t.child,n=null,l.alternate!==null&&l.alternate.memoizedState!==null&&l.alternate.memoizedState.cachePool!==null&&(n=l.alternate.memoizedState.cachePool.pool),i=null,l.memoizedState!==null&&l.memoizedState.cachePool!==null&&(i=l.memoizedState.cachePool.pool),i!==n&&(l.flags|=2048)),a!==e&&a&&(t.child.flags|=8192),Hi(t,t.updateQueue),De(t),null);case 4:return He(),e===null&&Ts(t.stateNode.containerInfo),De(t),null;case 10:return Wt(t.type),De(t),null;case 19:if(B(qe),l=t.memoizedState,l===null)return De(t),null;if(n=(t.flags&128)!==0,i=l.rendering,i===null)if(n)jn(l,!1);else{if(Le!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(i=Ti(e),i!==null){for(t.flags|=128,jn(l,!1),e=i.updateQueue,t.updateQueue=e,Hi(t,e),t.subtreeFlags=0,e=a,a=t.child;a!==null;)Ec(a,e),a=a.sibling;return Q(qe,qe.current&1|2),ve&&$t(t,l.treeForkCount),t.child}e=e.sibling}l.tail!==null&&dt()>Vi&&(t.flags|=128,n=!0,jn(l,!1),t.lanes=4194304)}else{if(!n)if(e=Ti(i),e!==null){if(t.flags|=128,n=!0,e=e.updateQueue,t.updateQueue=e,Hi(t,e),jn(l,!0),l.tail===null&&l.tailMode==="hidden"&&!i.alternate&&!ve)return De(t),null}else 2*dt()-l.renderingStartTime>Vi&&a!==536870912&&(t.flags|=128,n=!0,jn(l,!1),t.lanes=4194304);l.isBackwards?(i.sibling=t.child,t.child=i):(e=l.last,e!==null?e.sibling=i:t.child=i,l.last=i)}return l.tail!==null?(e=l.tail,l.rendering=e,l.tail=e.sibling,l.renderingStartTime=dt(),e.sibling=null,a=qe.current,Q(qe,n?a&1|2:a&1),ve&&$t(t,l.treeForkCount),e):(De(t),null);case 22:case 23:return xt(t),zo(),l=t.memoizedState!==null,e!==null?e.memoizedState!==null!==l&&(t.flags|=8192):l&&(t.flags|=8192),l?(a&536870912)!==0&&(t.flags&128)===0&&(De(t),t.subtreeFlags&6&&(t.flags|=8192)):De(t),a=t.updateQueue,a!==null&&Hi(t,a.retryQueue),a=null,e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(a=e.memoizedState.cachePool.pool),l=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(l=t.memoizedState.cachePool.pool),l!==a&&(t.flags|=2048),e!==null&&B(Ka),null;case 24:return a=null,e!==null&&(a=e.memoizedState.cache),t.memoizedState.cache!==a&&(t.flags|=2048),Wt(Ge),De(t),null;case 25:return null;case 30:return null}throw Error(u(156,t.tag))}function Xp(e,t){switch(fo(t),t.tag){case 1:return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Wt(Ge),He(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 26:case 27:case 5:return Fn(t),null;case 31:if(t.memoizedState!==null){if(xt(t),t.alternate===null)throw Error(u(340));Va()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 13:if(xt(t),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(u(340));Va()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return B(qe),null;case 4:return He(),null;case 10:return Wt(t.type),null;case 22:case 23:return xt(t),zo(),e!==null&&B(Ka),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 24:return Wt(Ge),null;case 25:return null;default:return null}}function Wf(e,t){switch(fo(t),t.tag){case 3:Wt(Ge),He();break;case 26:case 27:case 5:Fn(t);break;case 4:He();break;case 31:t.memoizedState!==null&&xt(t);break;case 13:xt(t);break;case 19:B(qe);break;case 10:Wt(t.type);break;case 22:case 23:xt(t),zo(),e!==null&&B(Ka);break;case 24:Wt(Ge)}}function Nn(e,t){try{var a=t.updateQueue,l=a!==null?a.lastEffect:null;if(l!==null){var n=l.next;a=n;do{if((a.tag&e)===e){l=void 0;var i=a.create,s=a.inst;l=i(),s.destroy=l}a=a.next}while(a!==n)}}catch(d){Ne(t,t.return,d)}}function wa(e,t,a){try{var l=t.updateQueue,n=l!==null?l.lastEffect:null;if(n!==null){var i=n.next;l=i;do{if((l.tag&e)===e){var s=l.inst,d=s.destroy;if(d!==void 0){s.destroy=void 0,n=t;var v=a,T=d;try{T()}catch(_){Ne(n,v,_)}}}l=l.next}while(l!==i)}}catch(_){Ne(t,t.return,_)}}function If(e){var t=e.updateQueue;if(t!==null){var a=e.stateNode;try{Yc(t,a)}catch(l){Ne(e,e.return,l)}}}function Pf(e,t,a){a.props=Ia(e.type,e.memoizedProps),a.state=e.memoizedState;try{a.componentWillUnmount()}catch(l){Ne(e,t,l)}}function Tn(e,t){try{var a=e.ref;if(a!==null){switch(e.tag){case 26:case 27:case 5:var l=e.stateNode;break;case 30:l=e.stateNode;break;default:l=e.stateNode}typeof a=="function"?e.refCleanup=a(l):a.current=l}}catch(n){Ne(e,t,n)}}function Yt(e,t){var a=e.ref,l=e.refCleanup;if(a!==null)if(typeof l=="function")try{l()}catch(n){Ne(e,t,n)}finally{e.refCleanup=null,e=e.alternate,e!=null&&(e.refCleanup=null)}else if(typeof a=="function")try{a(null)}catch(n){Ne(e,t,n)}else a.current=null}function ed(e){var t=e.type,a=e.memoizedProps,l=e.stateNode;try{e:switch(t){case"button":case"input":case"select":case"textarea":a.autoFocus&&l.focus();break e;case"img":a.src?l.src=a.src:a.srcSet&&(l.srcset=a.srcSet)}}catch(n){Ne(e,e.return,n)}}function is(e,t,a){try{var l=e.stateNode;fg(l,e.type,a,t),l[it]=t}catch(n){Ne(e,e.return,n)}}function td(e){return e.tag===5||e.tag===3||e.tag===26||e.tag===27&&Ca(e.type)||e.tag===4}function rs(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||td(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.tag===27&&Ca(e.type)||e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function os(e,t,a){var l=e.tag;if(l===5||l===6)e=e.stateNode,t?(a.nodeType===9?a.body:a.nodeName==="HTML"?a.ownerDocument.body:a).insertBefore(e,t):(t=a.nodeType===9?a.body:a.nodeName==="HTML"?a.ownerDocument.body:a,t.appendChild(e),a=a._reactRootContainer,a!=null||t.onclick!==null||(t.onclick=Zt));else if(l!==4&&(l===27&&Ca(e.type)&&(a=e.stateNode,t=null),e=e.child,e!==null))for(os(e,t,a),e=e.sibling;e!==null;)os(e,t,a),e=e.sibling}function qi(e,t,a){var l=e.tag;if(l===5||l===6)e=e.stateNode,t?a.insertBefore(e,t):a.appendChild(e);else if(l!==4&&(l===27&&Ca(e.type)&&(a=e.stateNode),e=e.child,e!==null))for(qi(e,t,a),e=e.sibling;e!==null;)qi(e,t,a),e=e.sibling}function ad(e){var t=e.stateNode,a=e.memoizedProps;try{for(var l=e.type,n=t.attributes;n.length;)t.removeAttributeNode(n[0]);Pe(t,l,a),t[$e]=e,t[it]=a}catch(i){Ne(e,e.return,i)}}var aa=!1,Qe=!1,ss=!1,ld=typeof WeakSet=="function"?WeakSet:Set,Je=null;function Vp(e,t){if(e=e.containerInfo,Cs=or,e=hc(e),eo(e)){if("selectionStart"in e)var a={start:e.selectionStart,end:e.selectionEnd};else e:{a=(a=e.ownerDocument)&&a.defaultView||window;var l=a.getSelection&&a.getSelection();if(l&&l.rangeCount!==0){a=l.anchorNode;var n=l.anchorOffset,i=l.focusNode;l=l.focusOffset;try{a.nodeType,i.nodeType}catch{a=null;break e}var s=0,d=-1,v=-1,T=0,_=0,M=e,A=null;t:for(;;){for(var C;M!==a||n!==0&&M.nodeType!==3||(d=s+n),M!==i||l!==0&&M.nodeType!==3||(v=s+l),M.nodeType===3&&(s+=M.nodeValue.length),(C=M.firstChild)!==null;)A=M,M=C;for(;;){if(M===e)break t;if(A===a&&++T===n&&(d=s),A===i&&++_===l&&(v=s),(C=M.nextSibling)!==null)break;M=A,A=M.parentNode}M=C}a=d===-1||v===-1?null:{start:d,end:v}}else a=null}a=a||{start:0,end:0}}else a=null;for(_s={focusedElem:e,selectionRange:a},or=!1,Je=t;Je!==null;)if(t=Je,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,Je=e;else for(;Je!==null;){switch(t=Je,i=t.alternate,e=t.flags,t.tag){case 0:if((e&4)!==0&&(e=t.updateQueue,e=e!==null?e.events:null,e!==null))for(a=0;a<e.length;a++)n=e[a],n.ref.impl=n.nextImpl;break;case 11:case 15:break;case 1:if((e&1024)!==0&&i!==null){e=void 0,a=t,n=i.memoizedProps,i=i.memoizedState,l=a.stateNode;try{var $=Ia(a.type,n);e=l.getSnapshotBeforeUpdate($,i),l.__reactInternalSnapshotBeforeUpdate=e}catch(le){Ne(a,a.return,le)}}break;case 3:if((e&1024)!==0){if(e=t.stateNode.containerInfo,a=e.nodeType,a===9)Ms(e);else if(a===1)switch(e.nodeName){case"HEAD":case"HTML":case"BODY":Ms(e);break;default:e.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((e&1024)!==0)throw Error(u(163))}if(e=t.sibling,e!==null){e.return=t.return,Je=e;break}Je=t.return}}function nd(e,t,a){var l=a.flags;switch(a.tag){case 0:case 11:case 15:na(e,a),l&4&&Nn(5,a);break;case 1:if(na(e,a),l&4)if(e=a.stateNode,t===null)try{e.componentDidMount()}catch(s){Ne(a,a.return,s)}else{var n=Ia(a.type,t.memoizedProps);t=t.memoizedState;try{e.componentDidUpdate(n,t,e.__reactInternalSnapshotBeforeUpdate)}catch(s){Ne(a,a.return,s)}}l&64&&If(a),l&512&&Tn(a,a.return);break;case 3:if(na(e,a),l&64&&(e=a.updateQueue,e!==null)){if(t=null,a.child!==null)switch(a.child.tag){case 27:case 5:t=a.child.stateNode;break;case 1:t=a.child.stateNode}try{Yc(e,t)}catch(s){Ne(a,a.return,s)}}break;case 27:t===null&&l&4&&ad(a);case 26:case 5:na(e,a),t===null&&l&4&&ed(a),l&512&&Tn(a,a.return);break;case 12:na(e,a);break;case 31:na(e,a),l&4&&od(e,a);break;case 13:na(e,a),l&4&&sd(e,a),l&64&&(e=a.memoizedState,e!==null&&(e=e.dehydrated,e!==null&&(a=Pp.bind(null,a),yg(e,a))));break;case 22:if(l=a.memoizedState!==null||aa,!l){t=t!==null&&t.memoizedState!==null||Qe,n=aa;var i=Qe;aa=l,(Qe=t)&&!i?ia(e,a,(a.subtreeFlags&8772)!==0):na(e,a),aa=n,Qe=i}break;case 30:break;default:na(e,a)}}function id(e){var t=e.alternate;t!==null&&(e.alternate=null,id(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&kr(t)),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}var Ue=null,ot=!1;function la(e,t,a){for(a=a.child;a!==null;)rd(e,t,a),a=a.sibling}function rd(e,t,a){if(mt&&typeof mt.onCommitFiberUnmount=="function")try{mt.onCommitFiberUnmount($l,a)}catch{}switch(a.tag){case 26:Qe||Yt(a,t),la(e,t,a),a.memoizedState?a.memoizedState.count--:a.stateNode&&(a=a.stateNode,a.parentNode.removeChild(a));break;case 27:Qe||Yt(a,t);var l=Ue,n=ot;Ca(a.type)&&(Ue=a.stateNode,ot=!1),la(e,t,a),Un(a.stateNode),Ue=l,ot=n;break;case 5:Qe||Yt(a,t);case 6:if(l=Ue,n=ot,Ue=null,la(e,t,a),Ue=l,ot=n,Ue!==null)if(ot)try{(Ue.nodeType===9?Ue.body:Ue.nodeName==="HTML"?Ue.ownerDocument.body:Ue).removeChild(a.stateNode)}catch(i){Ne(a,t,i)}else try{Ue.removeChild(a.stateNode)}catch(i){Ne(a,t,i)}break;case 18:Ue!==null&&(ot?(e=Ue,Id(e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e,a.stateNode),Yl(e)):Id(Ue,a.stateNode));break;case 4:l=Ue,n=ot,Ue=a.stateNode.containerInfo,ot=!0,la(e,t,a),Ue=l,ot=n;break;case 0:case 11:case 14:case 15:wa(2,a,t),Qe||wa(4,a,t),la(e,t,a);break;case 1:Qe||(Yt(a,t),l=a.stateNode,typeof l.componentWillUnmount=="function"&&Pf(a,t,l)),la(e,t,a);break;case 21:la(e,t,a);break;case 22:Qe=(l=Qe)||a.memoizedState!==null,la(e,t,a),Qe=l;break;default:la(e,t,a)}}function od(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null))){e=e.dehydrated;try{Yl(e)}catch(a){Ne(t,t.return,a)}}}function sd(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null&&(e=e.dehydrated,e!==null))))try{Yl(e)}catch(a){Ne(t,t.return,a)}}function Qp(e){switch(e.tag){case 31:case 13:case 19:var t=e.stateNode;return t===null&&(t=e.stateNode=new ld),t;case 22:return e=e.stateNode,t=e._retryCache,t===null&&(t=e._retryCache=new ld),t;default:throw Error(u(435,e.tag))}}function Yi(e,t){var a=Qp(e);t.forEach(function(l){if(!a.has(l)){a.add(l);var n=eg.bind(null,e,l);l.then(n,n)}})}function st(e,t){var a=t.deletions;if(a!==null)for(var l=0;l<a.length;l++){var n=a[l],i=e,s=t,d=s;e:for(;d!==null;){switch(d.tag){case 27:if(Ca(d.type)){Ue=d.stateNode,ot=!1;break e}break;case 5:Ue=d.stateNode,ot=!1;break e;case 3:case 4:Ue=d.stateNode.containerInfo,ot=!0;break e}d=d.return}if(Ue===null)throw Error(u(160));rd(i,s,n),Ue=null,ot=!1,i=n.alternate,i!==null&&(i.return=null),n.return=null}if(t.subtreeFlags&13886)for(t=t.child;t!==null;)ud(t,e),t=t.sibling}var Dt=null;function ud(e,t){var a=e.alternate,l=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:st(t,e),ut(e),l&4&&(wa(3,e,e.return),Nn(3,e),wa(5,e,e.return));break;case 1:st(t,e),ut(e),l&512&&(Qe||a===null||Yt(a,a.return)),l&64&&aa&&(e=e.updateQueue,e!==null&&(l=e.callbacks,l!==null&&(a=e.shared.hiddenCallbacks,e.shared.hiddenCallbacks=a===null?l:a.concat(l))));break;case 26:var n=Dt;if(st(t,e),ut(e),l&512&&(Qe||a===null||Yt(a,a.return)),l&4){var i=a!==null?a.memoizedState:null;if(l=e.memoizedState,a===null)if(l===null)if(e.stateNode===null){e:{l=e.type,a=e.memoizedProps,n=n.ownerDocument||n;t:switch(l){case"title":i=n.getElementsByTagName("title")[0],(!i||i[Il]||i[$e]||i.namespaceURI==="http://www.w3.org/2000/svg"||i.hasAttribute("itemprop"))&&(i=n.createElement(l),n.head.insertBefore(i,n.querySelector("head > title"))),Pe(i,l,a),i[$e]=e,Ke(i),l=i;break e;case"link":var s=um("link","href",n).get(l+(a.href||""));if(s){for(var d=0;d<s.length;d++)if(i=s[d],i.getAttribute("href")===(a.href==null||a.href===""?null:a.href)&&i.getAttribute("rel")===(a.rel==null?null:a.rel)&&i.getAttribute("title")===(a.title==null?null:a.title)&&i.getAttribute("crossorigin")===(a.crossOrigin==null?null:a.crossOrigin)){s.splice(d,1);break t}}i=n.createElement(l),Pe(i,l,a),n.head.appendChild(i);break;case"meta":if(s=um("meta","content",n).get(l+(a.content||""))){for(d=0;d<s.length;d++)if(i=s[d],i.getAttribute("content")===(a.content==null?null:""+a.content)&&i.getAttribute("name")===(a.name==null?null:a.name)&&i.getAttribute("property")===(a.property==null?null:a.property)&&i.getAttribute("http-equiv")===(a.httpEquiv==null?null:a.httpEquiv)&&i.getAttribute("charset")===(a.charSet==null?null:a.charSet)){s.splice(d,1);break t}}i=n.createElement(l),Pe(i,l,a),n.head.appendChild(i);break;default:throw Error(u(468,l))}i[$e]=e,Ke(i),l=i}e.stateNode=l}else cm(n,e.type,e.stateNode);else e.stateNode=sm(n,l,e.memoizedProps);else i!==l?(i===null?a.stateNode!==null&&(a=a.stateNode,a.parentNode.removeChild(a)):i.count--,l===null?cm(n,e.type,e.stateNode):sm(n,l,e.memoizedProps)):l===null&&e.stateNode!==null&&is(e,e.memoizedProps,a.memoizedProps)}break;case 27:st(t,e),ut(e),l&512&&(Qe||a===null||Yt(a,a.return)),a!==null&&l&4&&is(e,e.memoizedProps,a.memoizedProps);break;case 5:if(st(t,e),ut(e),l&512&&(Qe||a===null||Yt(a,a.return)),e.flags&32){n=e.stateNode;try{cl(n,"")}catch($){Ne(e,e.return,$)}}l&4&&e.stateNode!=null&&(n=e.memoizedProps,is(e,n,a!==null?a.memoizedProps:n)),l&1024&&(ss=!0);break;case 6:if(st(t,e),ut(e),l&4){if(e.stateNode===null)throw Error(u(162));l=e.memoizedProps,a=e.stateNode;try{a.nodeValue=l}catch($){Ne(e,e.return,$)}}break;case 3:if(lr=null,n=Dt,Dt=tr(t.containerInfo),st(t,e),Dt=n,ut(e),l&4&&a!==null&&a.memoizedState.isDehydrated)try{Yl(t.containerInfo)}catch($){Ne(e,e.return,$)}ss&&(ss=!1,cd(e));break;case 4:l=Dt,Dt=tr(e.stateNode.containerInfo),st(t,e),ut(e),Dt=l;break;case 12:st(t,e),ut(e);break;case 31:st(t,e),ut(e),l&4&&(l=e.updateQueue,l!==null&&(e.updateQueue=null,Yi(e,l)));break;case 13:st(t,e),ut(e),e.child.flags&8192&&e.memoizedState!==null!=(a!==null&&a.memoizedState!==null)&&(Xi=dt()),l&4&&(l=e.updateQueue,l!==null&&(e.updateQueue=null,Yi(e,l)));break;case 22:n=e.memoizedState!==null;var v=a!==null&&a.memoizedState!==null,T=aa,_=Qe;if(aa=T||n,Qe=_||v,st(t,e),Qe=_,aa=T,ut(e),l&8192)e:for(t=e.stateNode,t._visibility=n?t._visibility&-2:t._visibility|1,n&&(a===null||v||aa||Qe||Pa(e)),a=null,t=e;;){if(t.tag===5||t.tag===26){if(a===null){v=a=t;try{if(i=v.stateNode,n)s=i.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none";else{d=v.stateNode;var M=v.memoizedProps.style,A=M!=null&&M.hasOwnProperty("display")?M.display:null;d.style.display=A==null||typeof A=="boolean"?"":(""+A).trim()}}catch($){Ne(v,v.return,$)}}}else if(t.tag===6){if(a===null){v=t;try{v.stateNode.nodeValue=n?"":v.memoizedProps}catch($){Ne(v,v.return,$)}}}else if(t.tag===18){if(a===null){v=t;try{var C=v.stateNode;n?Pd(C,!0):Pd(v.stateNode,!1)}catch($){Ne(v,v.return,$)}}}else if((t.tag!==22&&t.tag!==23||t.memoizedState===null||t===e)&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;a===t&&(a=null),t=t.return}a===t&&(a=null),t.sibling.return=t.return,t=t.sibling}l&4&&(l=e.updateQueue,l!==null&&(a=l.retryQueue,a!==null&&(l.retryQueue=null,Yi(e,a))));break;case 19:st(t,e),ut(e),l&4&&(l=e.updateQueue,l!==null&&(e.updateQueue=null,Yi(e,l)));break;case 30:break;case 21:break;default:st(t,e),ut(e)}}function ut(e){var t=e.flags;if(t&2){try{for(var a,l=e.return;l!==null;){if(td(l)){a=l;break}l=l.return}if(a==null)throw Error(u(160));switch(a.tag){case 27:var n=a.stateNode,i=rs(e);qi(e,i,n);break;case 5:var s=a.stateNode;a.flags&32&&(cl(s,""),a.flags&=-33);var d=rs(e);qi(e,d,s);break;case 3:case 4:var v=a.stateNode.containerInfo,T=rs(e);os(e,T,v);break;default:throw Error(u(161))}}catch(_){Ne(e,e.return,_)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function cd(e){if(e.subtreeFlags&1024)for(e=e.child;e!==null;){var t=e;cd(t),t.tag===5&&t.flags&1024&&t.stateNode.reset(),e=e.sibling}}function na(e,t){if(t.subtreeFlags&8772)for(t=t.child;t!==null;)nd(e,t.alternate,t),t=t.sibling}function Pa(e){for(e=e.child;e!==null;){var t=e;switch(t.tag){case 0:case 11:case 14:case 15:wa(4,t,t.return),Pa(t);break;case 1:Yt(t,t.return);var a=t.stateNode;typeof a.componentWillUnmount=="function"&&Pf(t,t.return,a),Pa(t);break;case 27:Un(t.stateNode);case 26:case 5:Yt(t,t.return),Pa(t);break;case 22:t.memoizedState===null&&Pa(t);break;case 30:Pa(t);break;default:Pa(t)}e=e.sibling}}function ia(e,t,a){for(a=a&&(t.subtreeFlags&8772)!==0,t=t.child;t!==null;){var l=t.alternate,n=e,i=t,s=i.flags;switch(i.tag){case 0:case 11:case 15:ia(n,i,a),Nn(4,i);break;case 1:if(ia(n,i,a),l=i,n=l.stateNode,typeof n.componentDidMount=="function")try{n.componentDidMount()}catch(T){Ne(l,l.return,T)}if(l=i,n=l.updateQueue,n!==null){var d=l.stateNode;try{var v=n.shared.hiddenCallbacks;if(v!==null)for(n.shared.hiddenCallbacks=null,n=0;n<v.length;n++)qc(v[n],d)}catch(T){Ne(l,l.return,T)}}a&&s&64&&If(i),Tn(i,i.return);break;case 27:ad(i);case 26:case 5:ia(n,i,a),a&&l===null&&s&4&&ed(i),Tn(i,i.return);break;case 12:ia(n,i,a);break;case 31:ia(n,i,a),a&&s&4&&od(n,i);break;case 13:ia(n,i,a),a&&s&4&&sd(n,i);break;case 22:i.memoizedState===null&&ia(n,i,a),Tn(i,i.return);break;case 30:break;default:ia(n,i,a)}t=t.sibling}}function us(e,t){var a=null;e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(a=e.memoizedState.cachePool.pool),e=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(e=t.memoizedState.cachePool.pool),e!==a&&(e!=null&&e.refCount++,a!=null&&dn(a))}function cs(e,t){e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&dn(e))}function Ut(e,t,a,l){if(t.subtreeFlags&10256)for(t=t.child;t!==null;)fd(e,t,a,l),t=t.sibling}function fd(e,t,a,l){var n=t.flags;switch(t.tag){case 0:case 11:case 15:Ut(e,t,a,l),n&2048&&Nn(9,t);break;case 1:Ut(e,t,a,l);break;case 3:Ut(e,t,a,l),n&2048&&(e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&dn(e)));break;case 12:if(n&2048){Ut(e,t,a,l),e=t.stateNode;try{var i=t.memoizedProps,s=i.id,d=i.onPostCommit;typeof d=="function"&&d(s,t.alternate===null?"mount":"update",e.passiveEffectDuration,-0)}catch(v){Ne(t,t.return,v)}}else Ut(e,t,a,l);break;case 31:Ut(e,t,a,l);break;case 13:Ut(e,t,a,l);break;case 23:break;case 22:i=t.stateNode,s=t.alternate,t.memoizedState!==null?i._visibility&2?Ut(e,t,a,l):zn(e,t):i._visibility&2?Ut(e,t,a,l):(i._visibility|=2,_l(e,t,a,l,(t.subtreeFlags&10256)!==0||!1)),n&2048&&us(s,t);break;case 24:Ut(e,t,a,l),n&2048&&cs(t.alternate,t);break;default:Ut(e,t,a,l)}}function _l(e,t,a,l,n){for(n=n&&((t.subtreeFlags&10256)!==0||!1),t=t.child;t!==null;){var i=e,s=t,d=a,v=l,T=s.flags;switch(s.tag){case 0:case 11:case 15:_l(i,s,d,v,n),Nn(8,s);break;case 23:break;case 22:var _=s.stateNode;s.memoizedState!==null?_._visibility&2?_l(i,s,d,v,n):zn(i,s):(_._visibility|=2,_l(i,s,d,v,n)),n&&T&2048&&us(s.alternate,s);break;case 24:_l(i,s,d,v,n),n&&T&2048&&cs(s.alternate,s);break;default:_l(i,s,d,v,n)}t=t.sibling}}function zn(e,t){if(t.subtreeFlags&10256)for(t=t.child;t!==null;){var a=e,l=t,n=l.flags;switch(l.tag){case 22:zn(a,l),n&2048&&us(l.alternate,l);break;case 24:zn(a,l),n&2048&&cs(l.alternate,l);break;default:zn(a,l)}t=t.sibling}}var An=8192;function Rl(e,t,a){if(e.subtreeFlags&An)for(e=e.child;e!==null;)dd(e,t,a),e=e.sibling}function dd(e,t,a){switch(e.tag){case 26:Rl(e,t,a),e.flags&An&&e.memoizedState!==null&&Rg(a,Dt,e.memoizedState,e.memoizedProps);break;case 5:Rl(e,t,a);break;case 3:case 4:var l=Dt;Dt=tr(e.stateNode.containerInfo),Rl(e,t,a),Dt=l;break;case 22:e.memoizedState===null&&(l=e.alternate,l!==null&&l.memoizedState!==null?(l=An,An=16777216,Rl(e,t,a),An=l):Rl(e,t,a));break;default:Rl(e,t,a)}}function md(e){var t=e.alternate;if(t!==null&&(e=t.child,e!==null)){t.child=null;do t=e.sibling,e.sibling=null,e=t;while(e!==null)}}function Cn(e){var t=e.deletions;if((e.flags&16)!==0){if(t!==null)for(var a=0;a<t.length;a++){var l=t[a];Je=l,pd(l,e)}md(e)}if(e.subtreeFlags&10256)for(e=e.child;e!==null;)hd(e),e=e.sibling}function hd(e){switch(e.tag){case 0:case 11:case 15:Cn(e),e.flags&2048&&wa(9,e,e.return);break;case 3:Cn(e);break;case 12:Cn(e);break;case 22:var t=e.stateNode;e.memoizedState!==null&&t._visibility&2&&(e.return===null||e.return.tag!==13)?(t._visibility&=-3,Gi(e)):Cn(e);break;default:Cn(e)}}function Gi(e){var t=e.deletions;if((e.flags&16)!==0){if(t!==null)for(var a=0;a<t.length;a++){var l=t[a];Je=l,pd(l,e)}md(e)}for(e=e.child;e!==null;){switch(t=e,t.tag){case 0:case 11:case 15:wa(8,t,t.return),Gi(t);break;case 22:a=t.stateNode,a._visibility&2&&(a._visibility&=-3,Gi(t));break;default:Gi(t)}e=e.sibling}}function pd(e,t){for(;Je!==null;){var a=Je;switch(a.tag){case 0:case 11:case 15:wa(8,a,t);break;case 23:case 22:if(a.memoizedState!==null&&a.memoizedState.cachePool!==null){var l=a.memoizedState.cachePool.pool;l!=null&&l.refCount++}break;case 24:dn(a.memoizedState.cache)}if(l=a.child,l!==null)l.return=a,Je=l;else e:for(a=e;Je!==null;){l=Je;var n=l.sibling,i=l.return;if(id(l),l===a){Je=null;break e}if(n!==null){n.return=i,Je=n;break e}Je=i}}}var Zp={getCacheForType:function(e){var t=We(Ge),a=t.data.get(e);return a===void 0&&(a=e(),t.data.set(e,a)),a},cacheSignal:function(){return We(Ge).controller.signal}},Kp=typeof WeakMap=="function"?WeakMap:Map,we=0,Re=null,de=null,pe=0,je=0,yt=null,Ea=!1,Ol=!1,fs=!1,ra=0,Le=0,ja=0,el=0,ds=0,bt=0,Ml=0,_n=null,ct=null,ms=!1,Xi=0,gd=0,Vi=1/0,Qi=null,Na=null,Ze=0,Ta=null,Dl=null,oa=0,hs=0,ps=null,vd=null,Rn=0,gs=null;function St(){return(we&2)!==0&&pe!==0?pe&-pe:R.T!==null?ws():Ou()}function xd(){if(bt===0)if((pe&536870912)===0||ve){var e=Pn;Pn<<=1,(Pn&3932160)===0&&(Pn=262144),bt=e}else bt=536870912;return e=vt.current,e!==null&&(e.flags|=32),bt}function ft(e,t,a){(e===Re&&(je===2||je===9)||e.cancelPendingCommit!==null)&&(Ul(e,0),za(e,pe,bt,!1)),Wl(e,a),((we&2)===0||e!==Re)&&(e===Re&&((we&2)===0&&(el|=a),Le===4&&za(e,pe,bt,!1)),Gt(e))}function yd(e,t,a){if((we&6)!==0)throw Error(u(327));var l=!a&&(t&127)===0&&(t&e.expiredLanes)===0||Fl(e,t),n=l?Fp(e,t):xs(e,t,!0),i=l;do{if(n===0){Ol&&!l&&za(e,t,0,!1);break}else{if(a=e.current.alternate,i&&!Jp(a)){n=xs(e,t,!1),i=!1;continue}if(n===2){if(i=t,e.errorRecoveryDisabledLanes&i)var s=0;else s=e.pendingLanes&-536870913,s=s!==0?s:s&536870912?536870912:0;if(s!==0){t=s;e:{var d=e;n=_n;var v=d.current.memoizedState.isDehydrated;if(v&&(Ul(d,s).flags|=256),s=xs(d,s,!1),s!==2){if(fs&&!v){d.errorRecoveryDisabledLanes|=i,el|=i,n=4;break e}i=ct,ct=n,i!==null&&(ct===null?ct=i:ct.push.apply(ct,i))}n=s}if(i=!1,n!==2)continue}}if(n===1){Ul(e,0),za(e,t,0,!0);break}e:{switch(l=e,i=n,i){case 0:case 1:throw Error(u(345));case 4:if((t&4194048)!==t)break;case 6:za(l,t,bt,!Ea);break e;case 2:ct=null;break;case 3:case 5:break;default:throw Error(u(329))}if((t&62914560)===t&&(n=Xi+300-dt(),10<n)){if(za(l,t,bt,!Ea),ti(l,0,!0)!==0)break e;oa=t,l.timeoutHandle=Fd(bd.bind(null,l,a,ct,Qi,ms,t,bt,el,Ml,Ea,i,"Throttled",-0,0),n);break e}bd(l,a,ct,Qi,ms,t,bt,el,Ml,Ea,i,null,-0,0)}}break}while(!0);Gt(e)}function bd(e,t,a,l,n,i,s,d,v,T,_,M,A,C){if(e.timeoutHandle=-1,M=t.subtreeFlags,M&8192||(M&16785408)===16785408){M={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:Zt},dd(t,i,M);var $=(i&62914560)===i?Xi-dt():(i&4194048)===i?gd-dt():0;if($=Og(M,$),$!==null){oa=i,e.cancelPendingCommit=$(Ad.bind(null,e,t,i,a,l,n,s,d,v,_,M,null,A,C)),za(e,i,s,!T);return}}Ad(e,t,i,a,l,n,s,d,v)}function Jp(e){for(var t=e;;){var a=t.tag;if((a===0||a===11||a===15)&&t.flags&16384&&(a=t.updateQueue,a!==null&&(a=a.stores,a!==null)))for(var l=0;l<a.length;l++){var n=a[l],i=n.getSnapshot;n=n.value;try{if(!pt(i(),n))return!1}catch{return!1}}if(a=t.child,t.subtreeFlags&16384&&a!==null)a.return=t,t=a;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function za(e,t,a,l){t&=~ds,t&=~el,e.suspendedLanes|=t,e.pingedLanes&=~t,l&&(e.warmLanes|=t),l=e.expirationTimes;for(var n=t;0<n;){var i=31-ht(n),s=1<<i;l[i]=-1,n&=~s}a!==0&&Cu(e,a,t)}function Zi(){return(we&6)===0?(On(0),!1):!0}function vs(){if(de!==null){if(je===0)var e=de.return;else e=de,Ft=Qa=null,Mo(e),Nl=null,hn=0,e=de;for(;e!==null;)Wf(e.alternate,e),e=e.return;de=null}}function Ul(e,t){var a=e.timeoutHandle;a!==-1&&(e.timeoutHandle=-1,hg(a)),a=e.cancelPendingCommit,a!==null&&(e.cancelPendingCommit=null,a()),oa=0,vs(),Re=e,de=a=Jt(e.current,null),pe=t,je=0,yt=null,Ea=!1,Ol=Fl(e,t),fs=!1,Ml=bt=ds=el=ja=Le=0,ct=_n=null,ms=!1,(t&8)!==0&&(t|=t&32);var l=e.entangledLanes;if(l!==0)for(e=e.entanglements,l&=t;0<l;){var n=31-ht(l),i=1<<n;t|=e[n],l&=~i}return ra=t,mi(),a}function Sd(e,t){ue=null,R.H=wn,t===jl||t===Si?(t=Bc(),je=3):t===So?(t=Bc(),je=4):je=t===$o?8:t!==null&&typeof t=="object"&&typeof t.then=="function"?6:1,yt=t,de===null&&(Le=1,Ui(e,Tt(t,e.current)))}function wd(){var e=vt.current;return e===null?!0:(pe&4194048)===pe?_t===null:(pe&62914560)===pe||(pe&536870912)!==0?e===_t:!1}function Ed(){var e=R.H;return R.H=wn,e===null?wn:e}function jd(){var e=R.A;return R.A=Zp,e}function Ki(){Le=4,Ea||(pe&4194048)!==pe&&vt.current!==null||(Ol=!0),(ja&134217727)===0&&(el&134217727)===0||Re===null||za(Re,pe,bt,!1)}function xs(e,t,a){var l=we;we|=2;var n=Ed(),i=jd();(Re!==e||pe!==t)&&(Qi=null,Ul(e,t)),t=!1;var s=Le;e:do try{if(je!==0&&de!==null){var d=de,v=yt;switch(je){case 8:vs(),s=6;break e;case 3:case 2:case 9:case 6:vt.current===null&&(t=!0);var T=je;if(je=0,yt=null,Bl(e,d,v,T),a&&Ol){s=0;break e}break;default:T=je,je=0,yt=null,Bl(e,d,v,T)}}$p(),s=Le;break}catch(_){Sd(e,_)}while(!0);return t&&e.shellSuspendCounter++,Ft=Qa=null,we=l,R.H=n,R.A=i,de===null&&(Re=null,pe=0,mi()),s}function $p(){for(;de!==null;)Nd(de)}function Fp(e,t){var a=we;we|=2;var l=Ed(),n=jd();Re!==e||pe!==t?(Qi=null,Vi=dt()+500,Ul(e,t)):Ol=Fl(e,t);e:do try{if(je!==0&&de!==null){t=de;var i=yt;t:switch(je){case 1:je=0,yt=null,Bl(e,t,i,1);break;case 2:case 9:if(Dc(i)){je=0,yt=null,Td(t);break}t=function(){je!==2&&je!==9||Re!==e||(je=7),Gt(e)},i.then(t,t);break e;case 3:je=7;break e;case 4:je=5;break e;case 7:Dc(i)?(je=0,yt=null,Td(t)):(je=0,yt=null,Bl(e,t,i,7));break;case 5:var s=null;switch(de.tag){case 26:s=de.memoizedState;case 5:case 27:var d=de;if(s?fm(s):d.stateNode.complete){je=0,yt=null;var v=d.sibling;if(v!==null)de=v;else{var T=d.return;T!==null?(de=T,Ji(T)):de=null}break t}}je=0,yt=null,Bl(e,t,i,5);break;case 6:je=0,yt=null,Bl(e,t,i,6);break;case 8:vs(),Le=6;break e;default:throw Error(u(462))}}Wp();break}catch(_){Sd(e,_)}while(!0);return Ft=Qa=null,R.H=l,R.A=n,we=a,de!==null?0:(Re=null,pe=0,mi(),Le)}function Wp(){for(;de!==null&&!bh();)Nd(de)}function Nd(e){var t=$f(e.alternate,e,ra);e.memoizedProps=e.pendingProps,t===null?Ji(e):de=t}function Td(e){var t=e,a=t.alternate;switch(t.tag){case 15:case 0:t=Xf(a,t,t.pendingProps,t.type,void 0,pe);break;case 11:t=Xf(a,t,t.pendingProps,t.type.render,t.ref,pe);break;case 5:Mo(t);default:Wf(a,t),t=de=Ec(t,ra),t=$f(a,t,ra)}e.memoizedProps=e.pendingProps,t===null?Ji(e):de=t}function Bl(e,t,a,l){Ft=Qa=null,Mo(t),Nl=null,hn=0;var n=t.return;try{if(Hp(e,n,t,a,pe)){Le=1,Ui(e,Tt(a,e.current)),de=null;return}}catch(i){if(n!==null)throw de=n,i;Le=1,Ui(e,Tt(a,e.current)),de=null;return}t.flags&32768?(ve||l===1?e=!0:Ol||(pe&536870912)!==0?e=!1:(Ea=e=!0,(l===2||l===9||l===3||l===6)&&(l=vt.current,l!==null&&l.tag===13&&(l.flags|=16384))),zd(t,e)):Ji(t)}function Ji(e){var t=e;do{if((t.flags&32768)!==0){zd(t,Ea);return}e=t.return;var a=Gp(t.alternate,t,ra);if(a!==null){de=a;return}if(t=t.sibling,t!==null){de=t;return}de=t=e}while(t!==null);Le===0&&(Le=5)}function zd(e,t){do{var a=Xp(e.alternate,e);if(a!==null){a.flags&=32767,de=a;return}if(a=e.return,a!==null&&(a.flags|=32768,a.subtreeFlags=0,a.deletions=null),!t&&(e=e.sibling,e!==null)){de=e;return}de=e=a}while(e!==null);Le=6,de=null}function Ad(e,t,a,l,n,i,s,d,v){e.cancelPendingCommit=null;do $i();while(Ze!==0);if((we&6)!==0)throw Error(u(327));if(t!==null){if(t===e.current)throw Error(u(177));if(i=t.lanes|t.childLanes,i|=io,_h(e,a,i,s,d,v),e===Re&&(de=Re=null,pe=0),Dl=t,Ta=e,oa=a,hs=i,ps=n,vd=l,(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?(e.callbackNode=null,e.callbackPriority=0,tg(Wn,function(){return Md(),null})):(e.callbackNode=null,e.callbackPriority=0),l=(t.flags&13878)!==0,(t.subtreeFlags&13878)!==0||l){l=R.T,R.T=null,n=X.p,X.p=2,s=we,we|=4;try{Vp(e,t,a)}finally{we=s,X.p=n,R.T=l}}Ze=1,Cd(),_d(),Rd()}}function Cd(){if(Ze===1){Ze=0;var e=Ta,t=Dl,a=(t.flags&13878)!==0;if((t.subtreeFlags&13878)!==0||a){a=R.T,R.T=null;var l=X.p;X.p=2;var n=we;we|=4;try{ud(t,e);var i=_s,s=hc(e.containerInfo),d=i.focusedElem,v=i.selectionRange;if(s!==d&&d&&d.ownerDocument&&mc(d.ownerDocument.documentElement,d)){if(v!==null&&eo(d)){var T=v.start,_=v.end;if(_===void 0&&(_=T),"selectionStart"in d)d.selectionStart=T,d.selectionEnd=Math.min(_,d.value.length);else{var M=d.ownerDocument||document,A=M&&M.defaultView||window;if(A.getSelection){var C=A.getSelection(),$=d.textContent.length,le=Math.min(v.start,$),Ce=v.end===void 0?le:Math.min(v.end,$);!C.extend&&le>Ce&&(s=Ce,Ce=le,le=s);var j=dc(d,le),b=dc(d,Ce);if(j&&b&&(C.rangeCount!==1||C.anchorNode!==j.node||C.anchorOffset!==j.offset||C.focusNode!==b.node||C.focusOffset!==b.offset)){var N=M.createRange();N.setStart(j.node,j.offset),C.removeAllRanges(),le>Ce?(C.addRange(N),C.extend(b.node,b.offset)):(N.setEnd(b.node,b.offset),C.addRange(N))}}}}for(M=[],C=d;C=C.parentNode;)C.nodeType===1&&M.push({element:C,left:C.scrollLeft,top:C.scrollTop});for(typeof d.focus=="function"&&d.focus(),d=0;d<M.length;d++){var O=M[d];O.element.scrollLeft=O.left,O.element.scrollTop=O.top}}or=!!Cs,_s=Cs=null}finally{we=n,X.p=l,R.T=a}}e.current=t,Ze=2}}function _d(){if(Ze===2){Ze=0;var e=Ta,t=Dl,a=(t.flags&8772)!==0;if((t.subtreeFlags&8772)!==0||a){a=R.T,R.T=null;var l=X.p;X.p=2;var n=we;we|=4;try{nd(e,t.alternate,t)}finally{we=n,X.p=l,R.T=a}}Ze=3}}function Rd(){if(Ze===4||Ze===3){Ze=0,Sh();var e=Ta,t=Dl,a=oa,l=vd;(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?Ze=5:(Ze=0,Dl=Ta=null,Od(e,e.pendingLanes));var n=e.pendingLanes;if(n===0&&(Na=null),Ur(a),t=t.stateNode,mt&&typeof mt.onCommitFiberRoot=="function")try{mt.onCommitFiberRoot($l,t,void 0,(t.current.flags&128)===128)}catch{}if(l!==null){t=R.T,n=X.p,X.p=2,R.T=null;try{for(var i=e.onRecoverableError,s=0;s<l.length;s++){var d=l[s];i(d.value,{componentStack:d.stack})}}finally{R.T=t,X.p=n}}(oa&3)!==0&&$i(),Gt(e),n=e.pendingLanes,(a&261930)!==0&&(n&42)!==0?e===gs?Rn++:(Rn=0,gs=e):Rn=0,On(0)}}function Od(e,t){(e.pooledCacheLanes&=t)===0&&(t=e.pooledCache,t!=null&&(e.pooledCache=null,dn(t)))}function $i(){return Cd(),_d(),Rd(),Md()}function Md(){if(Ze!==5)return!1;var e=Ta,t=hs;hs=0;var a=Ur(oa),l=R.T,n=X.p;try{X.p=32>a?32:a,R.T=null,a=ps,ps=null;var i=Ta,s=oa;if(Ze=0,Dl=Ta=null,oa=0,(we&6)!==0)throw Error(u(331));var d=we;if(we|=4,hd(i.current),fd(i,i.current,s,a),we=d,On(0,!1),mt&&typeof mt.onPostCommitFiberRoot=="function")try{mt.onPostCommitFiberRoot($l,i)}catch{}return!0}finally{X.p=n,R.T=l,Od(e,t)}}function Dd(e,t,a){t=Tt(a,t),t=Jo(e.stateNode,t,2),e=ya(e,t,2),e!==null&&(Wl(e,2),Gt(e))}function Ne(e,t,a){if(e.tag===3)Dd(e,e,a);else for(;t!==null;){if(t.tag===3){Dd(t,e,a);break}else if(t.tag===1){var l=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof l.componentDidCatch=="function"&&(Na===null||!Na.has(l))){e=Tt(a,e),a=Uf(2),l=ya(t,a,2),l!==null&&(Bf(a,l,t,e),Wl(l,2),Gt(l));break}}t=t.return}}function ys(e,t,a){var l=e.pingCache;if(l===null){l=e.pingCache=new Kp;var n=new Set;l.set(t,n)}else n=l.get(t),n===void 0&&(n=new Set,l.set(t,n));n.has(a)||(fs=!0,n.add(a),e=Ip.bind(null,e,t,a),t.then(e,e))}function Ip(e,t,a){var l=e.pingCache;l!==null&&l.delete(t),e.pingedLanes|=e.suspendedLanes&a,e.warmLanes&=~a,Re===e&&(pe&a)===a&&(Le===4||Le===3&&(pe&62914560)===pe&&300>dt()-Xi?(we&2)===0&&Ul(e,0):ds|=a,Ml===pe&&(Ml=0)),Gt(e)}function Ud(e,t){t===0&&(t=Au()),e=Ga(e,t),e!==null&&(Wl(e,t),Gt(e))}function Pp(e){var t=e.memoizedState,a=0;t!==null&&(a=t.retryLane),Ud(e,a)}function eg(e,t){var a=0;switch(e.tag){case 31:case 13:var l=e.stateNode,n=e.memoizedState;n!==null&&(a=n.retryLane);break;case 19:l=e.stateNode;break;case 22:l=e.stateNode._retryCache;break;default:throw Error(u(314))}l!==null&&l.delete(t),Ud(e,a)}function tg(e,t){return Rr(e,t)}var Fi=null,kl=null,bs=!1,Wi=!1,Ss=!1,Aa=0;function Gt(e){e!==kl&&e.next===null&&(kl===null?Fi=kl=e:kl=kl.next=e),Wi=!0,bs||(bs=!0,lg())}function On(e,t){if(!Ss&&Wi){Ss=!0;do for(var a=!1,l=Fi;l!==null;){if(e!==0){var n=l.pendingLanes;if(n===0)var i=0;else{var s=l.suspendedLanes,d=l.pingedLanes;i=(1<<31-ht(42|e)+1)-1,i&=n&~(s&~d),i=i&201326741?i&201326741|1:i?i|2:0}i!==0&&(a=!0,Hd(l,i))}else i=pe,i=ti(l,l===Re?i:0,l.cancelPendingCommit!==null||l.timeoutHandle!==-1),(i&3)===0||Fl(l,i)||(a=!0,Hd(l,i));l=l.next}while(a);Ss=!1}}function ag(){Bd()}function Bd(){Wi=bs=!1;var e=0;Aa!==0&&mg()&&(e=Aa);for(var t=dt(),a=null,l=Fi;l!==null;){var n=l.next,i=kd(l,t);i===0?(l.next=null,a===null?Fi=n:a.next=n,n===null&&(kl=a)):(a=l,(e!==0||(i&3)!==0)&&(Wi=!0)),l=n}Ze!==0&&Ze!==5||On(e),Aa!==0&&(Aa=0)}function kd(e,t){for(var a=e.suspendedLanes,l=e.pingedLanes,n=e.expirationTimes,i=e.pendingLanes&-62914561;0<i;){var s=31-ht(i),d=1<<s,v=n[s];v===-1?((d&a)===0||(d&l)!==0)&&(n[s]=Ch(d,t)):v<=t&&(e.expiredLanes|=d),i&=~d}if(t=Re,a=pe,a=ti(e,e===t?a:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),l=e.callbackNode,a===0||e===t&&(je===2||je===9)||e.cancelPendingCommit!==null)return l!==null&&l!==null&&Or(l),e.callbackNode=null,e.callbackPriority=0;if((a&3)===0||Fl(e,a)){if(t=a&-a,t===e.callbackPriority)return t;switch(l!==null&&Or(l),Ur(a)){case 2:case 8:a=Tu;break;case 32:a=Wn;break;case 268435456:a=zu;break;default:a=Wn}return l=Ld.bind(null,e),a=Rr(a,l),e.callbackPriority=t,e.callbackNode=a,t}return l!==null&&l!==null&&Or(l),e.callbackPriority=2,e.callbackNode=null,2}function Ld(e,t){if(Ze!==0&&Ze!==5)return e.callbackNode=null,e.callbackPriority=0,null;var a=e.callbackNode;if($i()&&e.callbackNode!==a)return null;var l=pe;return l=ti(e,e===Re?l:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),l===0?null:(yd(e,l,t),kd(e,dt()),e.callbackNode!=null&&e.callbackNode===a?Ld.bind(null,e):null)}function Hd(e,t){if($i())return null;yd(e,t,!0)}function lg(){pg(function(){(we&6)!==0?Rr(Nu,ag):Bd()})}function ws(){if(Aa===0){var e=wl;e===0&&(e=In,In<<=1,(In&261888)===0&&(In=256)),Aa=e}return Aa}function qd(e){return e==null||typeof e=="symbol"||typeof e=="boolean"?null:typeof e=="function"?e:ii(""+e)}function Yd(e,t){var a=t.ownerDocument.createElement("input");return a.name=t.name,a.value=t.value,e.id&&a.setAttribute("form",e.id),t.parentNode.insertBefore(a,t),e=new FormData(e),a.parentNode.removeChild(a),e}function ng(e,t,a,l,n){if(t==="submit"&&a&&a.stateNode===n){var i=qd((n[it]||null).action),s=l.submitter;s&&(t=(t=s[it]||null)?qd(t.formAction):s.getAttribute("formAction"),t!==null&&(i=t,s=null));var d=new ui("action","action",null,l,n);e.push({event:d,listeners:[{instance:null,listener:function(){if(l.defaultPrevented){if(Aa!==0){var v=s?Yd(n,s):new FormData(n);Go(a,{pending:!0,data:v,method:n.method,action:i},null,v)}}else typeof i=="function"&&(d.preventDefault(),v=s?Yd(n,s):new FormData(n),Go(a,{pending:!0,data:v,method:n.method,action:i},i,v))},currentTarget:n}]})}}for(var Es=0;Es<no.length;Es++){var js=no[Es],ig=js.toLowerCase(),rg=js[0].toUpperCase()+js.slice(1);Mt(ig,"on"+rg)}Mt(vc,"onAnimationEnd"),Mt(xc,"onAnimationIteration"),Mt(yc,"onAnimationStart"),Mt("dblclick","onDoubleClick"),Mt("focusin","onFocus"),Mt("focusout","onBlur"),Mt(wp,"onTransitionRun"),Mt(Ep,"onTransitionStart"),Mt(jp,"onTransitionCancel"),Mt(bc,"onTransitionEnd"),sl("onMouseEnter",["mouseout","mouseover"]),sl("onMouseLeave",["mouseout","mouseover"]),sl("onPointerEnter",["pointerout","pointerover"]),sl("onPointerLeave",["pointerout","pointerover"]),La("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),La("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),La("onBeforeInput",["compositionend","keypress","textInput","paste"]),La("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),La("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),La("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Mn="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),og=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Mn));function Gd(e,t){t=(t&4)!==0;for(var a=0;a<e.length;a++){var l=e[a],n=l.event;l=l.listeners;e:{var i=void 0;if(t)for(var s=l.length-1;0<=s;s--){var d=l[s],v=d.instance,T=d.currentTarget;if(d=d.listener,v!==i&&n.isPropagationStopped())break e;i=d,n.currentTarget=T;try{i(n)}catch(_){di(_)}n.currentTarget=null,i=v}else for(s=0;s<l.length;s++){if(d=l[s],v=d.instance,T=d.currentTarget,d=d.listener,v!==i&&n.isPropagationStopped())break e;i=d,n.currentTarget=T;try{i(n)}catch(_){di(_)}n.currentTarget=null,i=v}}}}function me(e,t){var a=t[Br];a===void 0&&(a=t[Br]=new Set);var l=e+"__bubble";a.has(l)||(Xd(t,e,2,!1),a.add(l))}function Ns(e,t,a){var l=0;t&&(l|=4),Xd(a,e,l,t)}var Ii="_reactListening"+Math.random().toString(36).slice(2);function Ts(e){if(!e[Ii]){e[Ii]=!0,Uu.forEach(function(a){a!=="selectionchange"&&(og.has(a)||Ns(a,!1,e),Ns(a,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Ii]||(t[Ii]=!0,Ns("selectionchange",!1,t))}}function Xd(e,t,a,l){switch(xm(t)){case 2:var n=Ug;break;case 8:n=Bg;break;default:n=Ys}a=n.bind(null,t,a,e),n=void 0,!Qr||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(n=!0),l?n!==void 0?e.addEventListener(t,a,{capture:!0,passive:n}):e.addEventListener(t,a,!0):n!==void 0?e.addEventListener(t,a,{passive:n}):e.addEventListener(t,a,!1)}function zs(e,t,a,l,n){var i=l;if((t&1)===0&&(t&2)===0&&l!==null)e:for(;;){if(l===null)return;var s=l.tag;if(s===3||s===4){var d=l.stateNode.containerInfo;if(d===n)break;if(s===4)for(s=l.return;s!==null;){var v=s.tag;if((v===3||v===4)&&s.stateNode.containerInfo===n)return;s=s.return}for(;d!==null;){if(s=il(d),s===null)return;if(v=s.tag,v===5||v===6||v===26||v===27){l=i=s;continue e}d=d.parentNode}}l=l.return}Ku(function(){var T=i,_=Xr(a),M=[];e:{var A=Sc.get(e);if(A!==void 0){var C=ui,$=e;switch(e){case"keypress":if(oi(a)===0)break e;case"keydown":case"keyup":C=ep;break;case"focusin":$="focus",C=$r;break;case"focusout":$="blur",C=$r;break;case"beforeblur":case"afterblur":C=$r;break;case"click":if(a.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":C=Fu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":C=Gh;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":C=lp;break;case vc:case xc:case yc:C=Qh;break;case bc:C=ip;break;case"scroll":case"scrollend":C=qh;break;case"wheel":C=op;break;case"copy":case"cut":case"paste":C=Kh;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":C=Iu;break;case"toggle":case"beforetoggle":C=up}var le=(t&4)!==0,Ce=!le&&(e==="scroll"||e==="scrollend"),j=le?A!==null?A+"Capture":null:A;le=[];for(var b=T,N;b!==null;){var O=b;if(N=O.stateNode,O=O.tag,O!==5&&O!==26&&O!==27||N===null||j===null||(O=en(b,j),O!=null&&le.push(Dn(b,O,N))),Ce)break;b=b.return}0<le.length&&(A=new C(A,$,null,a,_),M.push({event:A,listeners:le}))}}if((t&7)===0){e:{if(A=e==="mouseover"||e==="pointerover",C=e==="mouseout"||e==="pointerout",A&&a!==Gr&&($=a.relatedTarget||a.fromElement)&&(il($)||$[nl]))break e;if((C||A)&&(A=_.window===_?_:(A=_.ownerDocument)?A.defaultView||A.parentWindow:window,C?($=a.relatedTarget||a.toElement,C=T,$=$?il($):null,$!==null&&(Ce=h($),le=$.tag,$!==Ce||le!==5&&le!==27&&le!==6)&&($=null)):(C=null,$=T),C!==$)){if(le=Fu,O="onMouseLeave",j="onMouseEnter",b="mouse",(e==="pointerout"||e==="pointerover")&&(le=Iu,O="onPointerLeave",j="onPointerEnter",b="pointer"),Ce=C==null?A:Pl(C),N=$==null?A:Pl($),A=new le(O,b+"leave",C,a,_),A.target=Ce,A.relatedTarget=N,O=null,il(_)===T&&(le=new le(j,b+"enter",$,a,_),le.target=N,le.relatedTarget=Ce,O=le),Ce=O,C&&$)t:{for(le=sg,j=C,b=$,N=0,O=j;O;O=le(O))N++;O=0;for(var te=b;te;te=le(te))O++;for(;0<N-O;)j=le(j),N--;for(;0<O-N;)b=le(b),O--;for(;N--;){if(j===b||b!==null&&j===b.alternate){le=j;break t}j=le(j),b=le(b)}le=null}else le=null;C!==null&&Vd(M,A,C,le,!1),$!==null&&Ce!==null&&Vd(M,Ce,$,le,!0)}}e:{if(A=T?Pl(T):window,C=A.nodeName&&A.nodeName.toLowerCase(),C==="select"||C==="input"&&A.type==="file")var be=rc;else if(nc(A))if(oc)be=yp;else{be=vp;var P=gp}else C=A.nodeName,!C||C.toLowerCase()!=="input"||A.type!=="checkbox"&&A.type!=="radio"?T&&Yr(T.elementType)&&(be=rc):be=xp;if(be&&(be=be(e,T))){ic(M,be,a,_);break e}P&&P(e,A,T),e==="focusout"&&T&&A.type==="number"&&T.memoizedProps.value!=null&&qr(A,"number",A.value)}switch(P=T?Pl(T):window,e){case"focusin":(nc(P)||P.contentEditable==="true")&&(hl=P,to=T,un=null);break;case"focusout":un=to=hl=null;break;case"mousedown":ao=!0;break;case"contextmenu":case"mouseup":case"dragend":ao=!1,pc(M,a,_);break;case"selectionchange":if(Sp)break;case"keydown":case"keyup":pc(M,a,_)}var ce;if(Wr)e:{switch(e){case"compositionstart":var ge="onCompositionStart";break e;case"compositionend":ge="onCompositionEnd";break e;case"compositionupdate":ge="onCompositionUpdate";break e}ge=void 0}else ml?ac(e,a)&&(ge="onCompositionEnd"):e==="keydown"&&a.keyCode===229&&(ge="onCompositionStart");ge&&(Pu&&a.locale!=="ko"&&(ml||ge!=="onCompositionStart"?ge==="onCompositionEnd"&&ml&&(ce=Ju()):(da=_,Zr="value"in da?da.value:da.textContent,ml=!0)),P=Pi(T,ge),0<P.length&&(ge=new Wu(ge,e,null,a,_),M.push({event:ge,listeners:P}),ce?ge.data=ce:(ce=lc(a),ce!==null&&(ge.data=ce)))),(ce=fp?dp(e,a):mp(e,a))&&(ge=Pi(T,"onBeforeInput"),0<ge.length&&(P=new Wu("onBeforeInput","beforeinput",null,a,_),M.push({event:P,listeners:ge}),P.data=ce)),ng(M,e,T,a,_)}Gd(M,t)})}function Dn(e,t,a){return{instance:e,listener:t,currentTarget:a}}function Pi(e,t){for(var a=t+"Capture",l=[];e!==null;){var n=e,i=n.stateNode;if(n=n.tag,n!==5&&n!==26&&n!==27||i===null||(n=en(e,a),n!=null&&l.unshift(Dn(e,n,i)),n=en(e,t),n!=null&&l.push(Dn(e,n,i))),e.tag===3)return l;e=e.return}return[]}function sg(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5&&e.tag!==27);return e||null}function Vd(e,t,a,l,n){for(var i=t._reactName,s=[];a!==null&&a!==l;){var d=a,v=d.alternate,T=d.stateNode;if(d=d.tag,v!==null&&v===l)break;d!==5&&d!==26&&d!==27||T===null||(v=T,n?(T=en(a,i),T!=null&&s.unshift(Dn(a,T,v))):n||(T=en(a,i),T!=null&&s.push(Dn(a,T,v)))),a=a.return}s.length!==0&&e.push({event:t,listeners:s})}var ug=/\r\n?/g,cg=/\u0000|\uFFFD/g;function Qd(e){return(typeof e=="string"?e:""+e).replace(ug,`
`).replace(cg,"")}function Zd(e,t){return t=Qd(t),Qd(e)===t}function Ae(e,t,a,l,n,i){switch(a){case"children":typeof l=="string"?t==="body"||t==="textarea"&&l===""||cl(e,l):(typeof l=="number"||typeof l=="bigint")&&t!=="body"&&cl(e,""+l);break;case"className":li(e,"class",l);break;case"tabIndex":li(e,"tabindex",l);break;case"dir":case"role":case"viewBox":case"width":case"height":li(e,a,l);break;case"style":Qu(e,l,i);break;case"data":if(t!=="object"){li(e,"data",l);break}case"src":case"href":if(l===""&&(t!=="a"||a!=="href")){e.removeAttribute(a);break}if(l==null||typeof l=="function"||typeof l=="symbol"||typeof l=="boolean"){e.removeAttribute(a);break}l=ii(""+l),e.setAttribute(a,l);break;case"action":case"formAction":if(typeof l=="function"){e.setAttribute(a,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof i=="function"&&(a==="formAction"?(t!=="input"&&Ae(e,t,"name",n.name,n,null),Ae(e,t,"formEncType",n.formEncType,n,null),Ae(e,t,"formMethod",n.formMethod,n,null),Ae(e,t,"formTarget",n.formTarget,n,null)):(Ae(e,t,"encType",n.encType,n,null),Ae(e,t,"method",n.method,n,null),Ae(e,t,"target",n.target,n,null)));if(l==null||typeof l=="symbol"||typeof l=="boolean"){e.removeAttribute(a);break}l=ii(""+l),e.setAttribute(a,l);break;case"onClick":l!=null&&(e.onclick=Zt);break;case"onScroll":l!=null&&me("scroll",e);break;case"onScrollEnd":l!=null&&me("scrollend",e);break;case"dangerouslySetInnerHTML":if(l!=null){if(typeof l!="object"||!("__html"in l))throw Error(u(61));if(a=l.__html,a!=null){if(n.children!=null)throw Error(u(60));e.innerHTML=a}}break;case"multiple":e.multiple=l&&typeof l!="function"&&typeof l!="symbol";break;case"muted":e.muted=l&&typeof l!="function"&&typeof l!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(l==null||typeof l=="function"||typeof l=="boolean"||typeof l=="symbol"){e.removeAttribute("xlink:href");break}a=ii(""+l),e.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",a);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":l!=null&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(a,""+l):e.removeAttribute(a);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":l&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(a,""):e.removeAttribute(a);break;case"capture":case"download":l===!0?e.setAttribute(a,""):l!==!1&&l!=null&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(a,l):e.removeAttribute(a);break;case"cols":case"rows":case"size":case"span":l!=null&&typeof l!="function"&&typeof l!="symbol"&&!isNaN(l)&&1<=l?e.setAttribute(a,l):e.removeAttribute(a);break;case"rowSpan":case"start":l==null||typeof l=="function"||typeof l=="symbol"||isNaN(l)?e.removeAttribute(a):e.setAttribute(a,l);break;case"popover":me("beforetoggle",e),me("toggle",e),ai(e,"popover",l);break;case"xlinkActuate":Qt(e,"http://www.w3.org/1999/xlink","xlink:actuate",l);break;case"xlinkArcrole":Qt(e,"http://www.w3.org/1999/xlink","xlink:arcrole",l);break;case"xlinkRole":Qt(e,"http://www.w3.org/1999/xlink","xlink:role",l);break;case"xlinkShow":Qt(e,"http://www.w3.org/1999/xlink","xlink:show",l);break;case"xlinkTitle":Qt(e,"http://www.w3.org/1999/xlink","xlink:title",l);break;case"xlinkType":Qt(e,"http://www.w3.org/1999/xlink","xlink:type",l);break;case"xmlBase":Qt(e,"http://www.w3.org/XML/1998/namespace","xml:base",l);break;case"xmlLang":Qt(e,"http://www.w3.org/XML/1998/namespace","xml:lang",l);break;case"xmlSpace":Qt(e,"http://www.w3.org/XML/1998/namespace","xml:space",l);break;case"is":ai(e,"is",l);break;case"innerText":case"textContent":break;default:(!(2<a.length)||a[0]!=="o"&&a[0]!=="O"||a[1]!=="n"&&a[1]!=="N")&&(a=Lh.get(a)||a,ai(e,a,l))}}function As(e,t,a,l,n,i){switch(a){case"style":Qu(e,l,i);break;case"dangerouslySetInnerHTML":if(l!=null){if(typeof l!="object"||!("__html"in l))throw Error(u(61));if(a=l.__html,a!=null){if(n.children!=null)throw Error(u(60));e.innerHTML=a}}break;case"children":typeof l=="string"?cl(e,l):(typeof l=="number"||typeof l=="bigint")&&cl(e,""+l);break;case"onScroll":l!=null&&me("scroll",e);break;case"onScrollEnd":l!=null&&me("scrollend",e);break;case"onClick":l!=null&&(e.onclick=Zt);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!Bu.hasOwnProperty(a))e:{if(a[0]==="o"&&a[1]==="n"&&(n=a.endsWith("Capture"),t=a.slice(2,n?a.length-7:void 0),i=e[it]||null,i=i!=null?i[a]:null,typeof i=="function"&&e.removeEventListener(t,i,n),typeof l=="function")){typeof i!="function"&&i!==null&&(a in e?e[a]=null:e.hasAttribute(a)&&e.removeAttribute(a)),e.addEventListener(t,l,n);break e}a in e?e[a]=l:l===!0?e.setAttribute(a,""):ai(e,a,l)}}}function Pe(e,t,a){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":me("error",e),me("load",e);var l=!1,n=!1,i;for(i in a)if(a.hasOwnProperty(i)){var s=a[i];if(s!=null)switch(i){case"src":l=!0;break;case"srcSet":n=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(u(137,t));default:Ae(e,t,i,s,a,null)}}n&&Ae(e,t,"srcSet",a.srcSet,a,null),l&&Ae(e,t,"src",a.src,a,null);return;case"input":me("invalid",e);var d=i=s=n=null,v=null,T=null;for(l in a)if(a.hasOwnProperty(l)){var _=a[l];if(_!=null)switch(l){case"name":n=_;break;case"type":s=_;break;case"checked":v=_;break;case"defaultChecked":T=_;break;case"value":i=_;break;case"defaultValue":d=_;break;case"children":case"dangerouslySetInnerHTML":if(_!=null)throw Error(u(137,t));break;default:Ae(e,t,l,_,a,null)}}Yu(e,i,d,v,T,s,n,!1);return;case"select":me("invalid",e),l=s=i=null;for(n in a)if(a.hasOwnProperty(n)&&(d=a[n],d!=null))switch(n){case"value":i=d;break;case"defaultValue":s=d;break;case"multiple":l=d;default:Ae(e,t,n,d,a,null)}t=i,a=s,e.multiple=!!l,t!=null?ul(e,!!l,t,!1):a!=null&&ul(e,!!l,a,!0);return;case"textarea":me("invalid",e),i=n=l=null;for(s in a)if(a.hasOwnProperty(s)&&(d=a[s],d!=null))switch(s){case"value":l=d;break;case"defaultValue":n=d;break;case"children":i=d;break;case"dangerouslySetInnerHTML":if(d!=null)throw Error(u(91));break;default:Ae(e,t,s,d,a,null)}Xu(e,l,n,i);return;case"option":for(v in a)if(a.hasOwnProperty(v)&&(l=a[v],l!=null))switch(v){case"selected":e.selected=l&&typeof l!="function"&&typeof l!="symbol";break;default:Ae(e,t,v,l,a,null)}return;case"dialog":me("beforetoggle",e),me("toggle",e),me("cancel",e),me("close",e);break;case"iframe":case"object":me("load",e);break;case"video":case"audio":for(l=0;l<Mn.length;l++)me(Mn[l],e);break;case"image":me("error",e),me("load",e);break;case"details":me("toggle",e);break;case"embed":case"source":case"link":me("error",e),me("load",e);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for(T in a)if(a.hasOwnProperty(T)&&(l=a[T],l!=null))switch(T){case"children":case"dangerouslySetInnerHTML":throw Error(u(137,t));default:Ae(e,t,T,l,a,null)}return;default:if(Yr(t)){for(_ in a)a.hasOwnProperty(_)&&(l=a[_],l!==void 0&&As(e,t,_,l,a,void 0));return}}for(d in a)a.hasOwnProperty(d)&&(l=a[d],l!=null&&Ae(e,t,d,l,a,null))}function fg(e,t,a,l){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var n=null,i=null,s=null,d=null,v=null,T=null,_=null;for(C in a){var M=a[C];if(a.hasOwnProperty(C)&&M!=null)switch(C){case"checked":break;case"value":break;case"defaultValue":v=M;default:l.hasOwnProperty(C)||Ae(e,t,C,null,l,M)}}for(var A in l){var C=l[A];if(M=a[A],l.hasOwnProperty(A)&&(C!=null||M!=null))switch(A){case"type":i=C;break;case"name":n=C;break;case"checked":T=C;break;case"defaultChecked":_=C;break;case"value":s=C;break;case"defaultValue":d=C;break;case"children":case"dangerouslySetInnerHTML":if(C!=null)throw Error(u(137,t));break;default:C!==M&&Ae(e,t,A,C,l,M)}}Hr(e,s,d,v,T,_,i,n);return;case"select":C=s=d=A=null;for(i in a)if(v=a[i],a.hasOwnProperty(i)&&v!=null)switch(i){case"value":break;case"multiple":C=v;default:l.hasOwnProperty(i)||Ae(e,t,i,null,l,v)}for(n in l)if(i=l[n],v=a[n],l.hasOwnProperty(n)&&(i!=null||v!=null))switch(n){case"value":A=i;break;case"defaultValue":d=i;break;case"multiple":s=i;default:i!==v&&Ae(e,t,n,i,l,v)}t=d,a=s,l=C,A!=null?ul(e,!!a,A,!1):!!l!=!!a&&(t!=null?ul(e,!!a,t,!0):ul(e,!!a,a?[]:"",!1));return;case"textarea":C=A=null;for(d in a)if(n=a[d],a.hasOwnProperty(d)&&n!=null&&!l.hasOwnProperty(d))switch(d){case"value":break;case"children":break;default:Ae(e,t,d,null,l,n)}for(s in l)if(n=l[s],i=a[s],l.hasOwnProperty(s)&&(n!=null||i!=null))switch(s){case"value":A=n;break;case"defaultValue":C=n;break;case"children":break;case"dangerouslySetInnerHTML":if(n!=null)throw Error(u(91));break;default:n!==i&&Ae(e,t,s,n,l,i)}Gu(e,A,C);return;case"option":for(var $ in a)if(A=a[$],a.hasOwnProperty($)&&A!=null&&!l.hasOwnProperty($))switch($){case"selected":e.selected=!1;break;default:Ae(e,t,$,null,l,A)}for(v in l)if(A=l[v],C=a[v],l.hasOwnProperty(v)&&A!==C&&(A!=null||C!=null))switch(v){case"selected":e.selected=A&&typeof A!="function"&&typeof A!="symbol";break;default:Ae(e,t,v,A,l,C)}return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var le in a)A=a[le],a.hasOwnProperty(le)&&A!=null&&!l.hasOwnProperty(le)&&Ae(e,t,le,null,l,A);for(T in l)if(A=l[T],C=a[T],l.hasOwnProperty(T)&&A!==C&&(A!=null||C!=null))switch(T){case"children":case"dangerouslySetInnerHTML":if(A!=null)throw Error(u(137,t));break;default:Ae(e,t,T,A,l,C)}return;default:if(Yr(t)){for(var Ce in a)A=a[Ce],a.hasOwnProperty(Ce)&&A!==void 0&&!l.hasOwnProperty(Ce)&&As(e,t,Ce,void 0,l,A);for(_ in l)A=l[_],C=a[_],!l.hasOwnProperty(_)||A===C||A===void 0&&C===void 0||As(e,t,_,A,l,C);return}}for(var j in a)A=a[j],a.hasOwnProperty(j)&&A!=null&&!l.hasOwnProperty(j)&&Ae(e,t,j,null,l,A);for(M in l)A=l[M],C=a[M],!l.hasOwnProperty(M)||A===C||A==null&&C==null||Ae(e,t,M,A,l,C)}function Kd(e){switch(e){case"css":case"script":case"font":case"img":case"image":case"input":case"link":return!0;default:return!1}}function dg(){if(typeof performance.getEntriesByType=="function"){for(var e=0,t=0,a=performance.getEntriesByType("resource"),l=0;l<a.length;l++){var n=a[l],i=n.transferSize,s=n.initiatorType,d=n.duration;if(i&&d&&Kd(s)){for(s=0,d=n.responseEnd,l+=1;l<a.length;l++){var v=a[l],T=v.startTime;if(T>d)break;var _=v.transferSize,M=v.initiatorType;_&&Kd(M)&&(v=v.responseEnd,s+=_*(v<d?1:(d-T)/(v-T)))}if(--l,t+=8*(i+s)/(n.duration/1e3),e++,10<e)break}}if(0<e)return t/e/1e6}return navigator.connection&&(e=navigator.connection.downlink,typeof e=="number")?e:5}var Cs=null,_s=null;function er(e){return e.nodeType===9?e:e.ownerDocument}function Jd(e){switch(e){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function $d(e,t){if(e===0)switch(t){case"svg":return 1;case"math":return 2;default:return 0}return e===1&&t==="foreignObject"?0:e}function Rs(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.children=="bigint"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Os=null;function mg(){var e=window.event;return e&&e.type==="popstate"?e===Os?!1:(Os=e,!0):(Os=null,!1)}var Fd=typeof setTimeout=="function"?setTimeout:void 0,hg=typeof clearTimeout=="function"?clearTimeout:void 0,Wd=typeof Promise=="function"?Promise:void 0,pg=typeof queueMicrotask=="function"?queueMicrotask:typeof Wd<"u"?function(e){return Wd.resolve(null).then(e).catch(gg)}:Fd;function gg(e){setTimeout(function(){throw e})}function Ca(e){return e==="head"}function Id(e,t){var a=t,l=0;do{var n=a.nextSibling;if(e.removeChild(a),n&&n.nodeType===8)if(a=n.data,a==="/$"||a==="/&"){if(l===0){e.removeChild(n),Yl(t);return}l--}else if(a==="$"||a==="$?"||a==="$~"||a==="$!"||a==="&")l++;else if(a==="html")Un(e.ownerDocument.documentElement);else if(a==="head"){a=e.ownerDocument.head,Un(a);for(var i=a.firstChild;i;){var s=i.nextSibling,d=i.nodeName;i[Il]||d==="SCRIPT"||d==="STYLE"||d==="LINK"&&i.rel.toLowerCase()==="stylesheet"||a.removeChild(i),i=s}}else a==="body"&&Un(e.ownerDocument.body);a=n}while(a);Yl(t)}function Pd(e,t){var a=e;e=0;do{var l=a.nextSibling;if(a.nodeType===1?t?(a._stashedDisplay=a.style.display,a.style.display="none"):(a.style.display=a._stashedDisplay||"",a.getAttribute("style")===""&&a.removeAttribute("style")):a.nodeType===3&&(t?(a._stashedText=a.nodeValue,a.nodeValue=""):a.nodeValue=a._stashedText||""),l&&l.nodeType===8)if(a=l.data,a==="/$"){if(e===0)break;e--}else a!=="$"&&a!=="$?"&&a!=="$~"&&a!=="$!"||e++;a=l}while(a)}function Ms(e){var t=e.firstChild;for(t&&t.nodeType===10&&(t=t.nextSibling);t;){var a=t;switch(t=t.nextSibling,a.nodeName){case"HTML":case"HEAD":case"BODY":Ms(a),kr(a);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(a.rel.toLowerCase()==="stylesheet")continue}e.removeChild(a)}}function vg(e,t,a,l){for(;e.nodeType===1;){var n=a;if(e.nodeName.toLowerCase()!==t.toLowerCase()){if(!l&&(e.nodeName!=="INPUT"||e.type!=="hidden"))break}else if(l){if(!e[Il])switch(t){case"meta":if(!e.hasAttribute("itemprop"))break;return e;case"link":if(i=e.getAttribute("rel"),i==="stylesheet"&&e.hasAttribute("data-precedence"))break;if(i!==n.rel||e.getAttribute("href")!==(n.href==null||n.href===""?null:n.href)||e.getAttribute("crossorigin")!==(n.crossOrigin==null?null:n.crossOrigin)||e.getAttribute("title")!==(n.title==null?null:n.title))break;return e;case"style":if(e.hasAttribute("data-precedence"))break;return e;case"script":if(i=e.getAttribute("src"),(i!==(n.src==null?null:n.src)||e.getAttribute("type")!==(n.type==null?null:n.type)||e.getAttribute("crossorigin")!==(n.crossOrigin==null?null:n.crossOrigin))&&i&&e.hasAttribute("async")&&!e.hasAttribute("itemprop"))break;return e;default:return e}}else if(t==="input"&&e.type==="hidden"){var i=n.name==null?null:""+n.name;if(n.type==="hidden"&&e.getAttribute("name")===i)return e}else return e;if(e=Rt(e.nextSibling),e===null)break}return null}function xg(e,t,a){if(t==="")return null;for(;e.nodeType!==3;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!a||(e=Rt(e.nextSibling),e===null))return null;return e}function em(e,t){for(;e.nodeType!==8;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!t||(e=Rt(e.nextSibling),e===null))return null;return e}function Ds(e){return e.data==="$?"||e.data==="$~"}function Us(e){return e.data==="$!"||e.data==="$?"&&e.ownerDocument.readyState!=="loading"}function yg(e,t){var a=e.ownerDocument;if(e.data==="$~")e._reactRetry=t;else if(e.data!=="$?"||a.readyState!=="loading")t();else{var l=function(){t(),a.removeEventListener("DOMContentLoaded",l)};a.addEventListener("DOMContentLoaded",l),e._reactRetry=l}}function Rt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?"||t==="$~"||t==="&"||t==="F!"||t==="F")break;if(t==="/$"||t==="/&")return null}}return e}var Bs=null;function tm(e){e=e.nextSibling;for(var t=0;e;){if(e.nodeType===8){var a=e.data;if(a==="/$"||a==="/&"){if(t===0)return Rt(e.nextSibling);t--}else a!=="$"&&a!=="$!"&&a!=="$?"&&a!=="$~"&&a!=="&"||t++}e=e.nextSibling}return null}function am(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var a=e.data;if(a==="$"||a==="$!"||a==="$?"||a==="$~"||a==="&"){if(t===0)return e;t--}else a!=="/$"&&a!=="/&"||t++}e=e.previousSibling}return null}function lm(e,t,a){switch(t=er(a),e){case"html":if(e=t.documentElement,!e)throw Error(u(452));return e;case"head":if(e=t.head,!e)throw Error(u(453));return e;case"body":if(e=t.body,!e)throw Error(u(454));return e;default:throw Error(u(451))}}function Un(e){for(var t=e.attributes;t.length;)e.removeAttributeNode(t[0]);kr(e)}var Ot=new Map,nm=new Set;function tr(e){return typeof e.getRootNode=="function"?e.getRootNode():e.nodeType===9?e:e.ownerDocument}var sa=X.d;X.d={f:bg,r:Sg,D:wg,C:Eg,L:jg,m:Ng,X:zg,S:Tg,M:Ag};function bg(){var e=sa.f(),t=Zi();return e||t}function Sg(e){var t=rl(e);t!==null&&t.tag===5&&t.type==="form"?Sf(t):sa.r(e)}var Ll=typeof document>"u"?null:document;function im(e,t,a){var l=Ll;if(l&&typeof t=="string"&&t){var n=jt(t);n='link[rel="'+e+'"][href="'+n+'"]',typeof a=="string"&&(n+='[crossorigin="'+a+'"]'),nm.has(n)||(nm.add(n),e={rel:e,crossOrigin:a,href:t},l.querySelector(n)===null&&(t=l.createElement("link"),Pe(t,"link",e),Ke(t),l.head.appendChild(t)))}}function wg(e){sa.D(e),im("dns-prefetch",e,null)}function Eg(e,t){sa.C(e,t),im("preconnect",e,t)}function jg(e,t,a){sa.L(e,t,a);var l=Ll;if(l&&e&&t){var n='link[rel="preload"][as="'+jt(t)+'"]';t==="image"&&a&&a.imageSrcSet?(n+='[imagesrcset="'+jt(a.imageSrcSet)+'"]',typeof a.imageSizes=="string"&&(n+='[imagesizes="'+jt(a.imageSizes)+'"]')):n+='[href="'+jt(e)+'"]';var i=n;switch(t){case"style":i=Hl(e);break;case"script":i=ql(e)}Ot.has(i)||(e=E({rel:"preload",href:t==="image"&&a&&a.imageSrcSet?void 0:e,as:t},a),Ot.set(i,e),l.querySelector(n)!==null||t==="style"&&l.querySelector(Bn(i))||t==="script"&&l.querySelector(kn(i))||(t=l.createElement("link"),Pe(t,"link",e),Ke(t),l.head.appendChild(t)))}}function Ng(e,t){sa.m(e,t);var a=Ll;if(a&&e){var l=t&&typeof t.as=="string"?t.as:"script",n='link[rel="modulepreload"][as="'+jt(l)+'"][href="'+jt(e)+'"]',i=n;switch(l){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":i=ql(e)}if(!Ot.has(i)&&(e=E({rel:"modulepreload",href:e},t),Ot.set(i,e),a.querySelector(n)===null)){switch(l){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(a.querySelector(kn(i)))return}l=a.createElement("link"),Pe(l,"link",e),Ke(l),a.head.appendChild(l)}}}function Tg(e,t,a){sa.S(e,t,a);var l=Ll;if(l&&e){var n=ol(l).hoistableStyles,i=Hl(e);t=t||"default";var s=n.get(i);if(!s){var d={loading:0,preload:null};if(s=l.querySelector(Bn(i)))d.loading=5;else{e=E({rel:"stylesheet",href:e,"data-precedence":t},a),(a=Ot.get(i))&&ks(e,a);var v=s=l.createElement("link");Ke(v),Pe(v,"link",e),v._p=new Promise(function(T,_){v.onload=T,v.onerror=_}),v.addEventListener("load",function(){d.loading|=1}),v.addEventListener("error",function(){d.loading|=2}),d.loading|=4,ar(s,t,l)}s={type:"stylesheet",instance:s,count:1,state:d},n.set(i,s)}}}function zg(e,t){sa.X(e,t);var a=Ll;if(a&&e){var l=ol(a).hoistableScripts,n=ql(e),i=l.get(n);i||(i=a.querySelector(kn(n)),i||(e=E({src:e,async:!0},t),(t=Ot.get(n))&&Ls(e,t),i=a.createElement("script"),Ke(i),Pe(i,"link",e),a.head.appendChild(i)),i={type:"script",instance:i,count:1,state:null},l.set(n,i))}}function Ag(e,t){sa.M(e,t);var a=Ll;if(a&&e){var l=ol(a).hoistableScripts,n=ql(e),i=l.get(n);i||(i=a.querySelector(kn(n)),i||(e=E({src:e,async:!0,type:"module"},t),(t=Ot.get(n))&&Ls(e,t),i=a.createElement("script"),Ke(i),Pe(i,"link",e),a.head.appendChild(i)),i={type:"script",instance:i,count:1,state:null},l.set(n,i))}}function rm(e,t,a,l){var n=(n=fe.current)?tr(n):null;if(!n)throw Error(u(446));switch(e){case"meta":case"title":return null;case"style":return typeof a.precedence=="string"&&typeof a.href=="string"?(t=Hl(a.href),a=ol(n).hoistableStyles,l=a.get(t),l||(l={type:"style",instance:null,count:0,state:null},a.set(t,l)),l):{type:"void",instance:null,count:0,state:null};case"link":if(a.rel==="stylesheet"&&typeof a.href=="string"&&typeof a.precedence=="string"){e=Hl(a.href);var i=ol(n).hoistableStyles,s=i.get(e);if(s||(n=n.ownerDocument||n,s={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},i.set(e,s),(i=n.querySelector(Bn(e)))&&!i._p&&(s.instance=i,s.state.loading=5),Ot.has(e)||(a={rel:"preload",as:"style",href:a.href,crossOrigin:a.crossOrigin,integrity:a.integrity,media:a.media,hrefLang:a.hrefLang,referrerPolicy:a.referrerPolicy},Ot.set(e,a),i||Cg(n,e,a,s.state))),t&&l===null)throw Error(u(528,""));return s}if(t&&l!==null)throw Error(u(529,""));return null;case"script":return t=a.async,a=a.src,typeof a=="string"&&t&&typeof t!="function"&&typeof t!="symbol"?(t=ql(a),a=ol(n).hoistableScripts,l=a.get(t),l||(l={type:"script",instance:null,count:0,state:null},a.set(t,l)),l):{type:"void",instance:null,count:0,state:null};default:throw Error(u(444,e))}}function Hl(e){return'href="'+jt(e)+'"'}function Bn(e){return'link[rel="stylesheet"]['+e+"]"}function om(e){return E({},e,{"data-precedence":e.precedence,precedence:null})}function Cg(e,t,a,l){e.querySelector('link[rel="preload"][as="style"]['+t+"]")?l.loading=1:(t=e.createElement("link"),l.preload=t,t.addEventListener("load",function(){return l.loading|=1}),t.addEventListener("error",function(){return l.loading|=2}),Pe(t,"link",a),Ke(t),e.head.appendChild(t))}function ql(e){return'[src="'+jt(e)+'"]'}function kn(e){return"script[async]"+e}function sm(e,t,a){if(t.count++,t.instance===null)switch(t.type){case"style":var l=e.querySelector('style[data-href~="'+jt(a.href)+'"]');if(l)return t.instance=l,Ke(l),l;var n=E({},a,{"data-href":a.href,"data-precedence":a.precedence,href:null,precedence:null});return l=(e.ownerDocument||e).createElement("style"),Ke(l),Pe(l,"style",n),ar(l,a.precedence,e),t.instance=l;case"stylesheet":n=Hl(a.href);var i=e.querySelector(Bn(n));if(i)return t.state.loading|=4,t.instance=i,Ke(i),i;l=om(a),(n=Ot.get(n))&&ks(l,n),i=(e.ownerDocument||e).createElement("link"),Ke(i);var s=i;return s._p=new Promise(function(d,v){s.onload=d,s.onerror=v}),Pe(i,"link",l),t.state.loading|=4,ar(i,a.precedence,e),t.instance=i;case"script":return i=ql(a.src),(n=e.querySelector(kn(i)))?(t.instance=n,Ke(n),n):(l=a,(n=Ot.get(i))&&(l=E({},a),Ls(l,n)),e=e.ownerDocument||e,n=e.createElement("script"),Ke(n),Pe(n,"link",l),e.head.appendChild(n),t.instance=n);case"void":return null;default:throw Error(u(443,t.type))}else t.type==="stylesheet"&&(t.state.loading&4)===0&&(l=t.instance,t.state.loading|=4,ar(l,a.precedence,e));return t.instance}function ar(e,t,a){for(var l=a.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),n=l.length?l[l.length-1]:null,i=n,s=0;s<l.length;s++){var d=l[s];if(d.dataset.precedence===t)i=d;else if(i!==n)break}i?i.parentNode.insertBefore(e,i.nextSibling):(t=a.nodeType===9?a.head:a,t.insertBefore(e,t.firstChild))}function ks(e,t){e.crossOrigin==null&&(e.crossOrigin=t.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=t.referrerPolicy),e.title==null&&(e.title=t.title)}function Ls(e,t){e.crossOrigin==null&&(e.crossOrigin=t.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=t.referrerPolicy),e.integrity==null&&(e.integrity=t.integrity)}var lr=null;function um(e,t,a){if(lr===null){var l=new Map,n=lr=new Map;n.set(a,l)}else n=lr,l=n.get(a),l||(l=new Map,n.set(a,l));if(l.has(e))return l;for(l.set(e,null),a=a.getElementsByTagName(e),n=0;n<a.length;n++){var i=a[n];if(!(i[Il]||i[$e]||e==="link"&&i.getAttribute("rel")==="stylesheet")&&i.namespaceURI!=="http://www.w3.org/2000/svg"){var s=i.getAttribute(t)||"";s=e+s;var d=l.get(s);d?d.push(i):l.set(s,[i])}}return l}function cm(e,t,a){e=e.ownerDocument||e,e.head.insertBefore(a,t==="title"?e.querySelector("head > title"):null)}function _g(e,t,a){if(a===1||t.itemProp!=null)return!1;switch(e){case"meta":case"title":return!0;case"style":if(typeof t.precedence!="string"||typeof t.href!="string"||t.href==="")break;return!0;case"link":if(typeof t.rel!="string"||typeof t.href!="string"||t.href===""||t.onLoad||t.onError)break;switch(t.rel){case"stylesheet":return e=t.disabled,typeof t.precedence=="string"&&e==null;default:return!0}case"script":if(t.async&&typeof t.async!="function"&&typeof t.async!="symbol"&&!t.onLoad&&!t.onError&&t.src&&typeof t.src=="string")return!0}return!1}function fm(e){return!(e.type==="stylesheet"&&(e.state.loading&3)===0)}function Rg(e,t,a,l){if(a.type==="stylesheet"&&(typeof l.media!="string"||matchMedia(l.media).matches!==!1)&&(a.state.loading&4)===0){if(a.instance===null){var n=Hl(l.href),i=t.querySelector(Bn(n));if(i){t=i._p,t!==null&&typeof t=="object"&&typeof t.then=="function"&&(e.count++,e=nr.bind(e),t.then(e,e)),a.state.loading|=4,a.instance=i,Ke(i);return}i=t.ownerDocument||t,l=om(l),(n=Ot.get(n))&&ks(l,n),i=i.createElement("link"),Ke(i);var s=i;s._p=new Promise(function(d,v){s.onload=d,s.onerror=v}),Pe(i,"link",l),a.instance=i}e.stylesheets===null&&(e.stylesheets=new Map),e.stylesheets.set(a,t),(t=a.state.preload)&&(a.state.loading&3)===0&&(e.count++,a=nr.bind(e),t.addEventListener("load",a),t.addEventListener("error",a))}}var Hs=0;function Og(e,t){return e.stylesheets&&e.count===0&&rr(e,e.stylesheets),0<e.count||0<e.imgCount?function(a){var l=setTimeout(function(){if(e.stylesheets&&rr(e,e.stylesheets),e.unsuspend){var i=e.unsuspend;e.unsuspend=null,i()}},6e4+t);0<e.imgBytes&&Hs===0&&(Hs=62500*dg());var n=setTimeout(function(){if(e.waitingForImages=!1,e.count===0&&(e.stylesheets&&rr(e,e.stylesheets),e.unsuspend)){var i=e.unsuspend;e.unsuspend=null,i()}},(e.imgBytes>Hs?50:800)+t);return e.unsuspend=a,function(){e.unsuspend=null,clearTimeout(l),clearTimeout(n)}}:null}function nr(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)rr(this,this.stylesheets);else if(this.unsuspend){var e=this.unsuspend;this.unsuspend=null,e()}}}var ir=null;function rr(e,t){e.stylesheets=null,e.unsuspend!==null&&(e.count++,ir=new Map,t.forEach(Mg,e),ir=null,nr.call(e))}function Mg(e,t){if(!(t.state.loading&4)){var a=ir.get(e);if(a)var l=a.get(null);else{a=new Map,ir.set(e,a);for(var n=e.querySelectorAll("link[data-precedence],style[data-precedence]"),i=0;i<n.length;i++){var s=n[i];(s.nodeName==="LINK"||s.getAttribute("media")!=="not all")&&(a.set(s.dataset.precedence,s),l=s)}l&&a.set(null,l)}n=t.instance,s=n.getAttribute("data-precedence"),i=a.get(s)||l,i===l&&a.set(null,n),a.set(s,n),this.count++,l=nr.bind(this),n.addEventListener("load",l),n.addEventListener("error",l),i?i.parentNode.insertBefore(n,i.nextSibling):(e=e.nodeType===9?e.head:e,e.insertBefore(n,e.firstChild)),t.state.loading|=4}}var Ln={$$typeof:L,Provider:null,Consumer:null,_currentValue:ne,_currentValue2:ne,_threadCount:0};function Dg(e,t,a,l,n,i,s,d,v){this.tag=1,this.containerInfo=e,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=Mr(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Mr(0),this.hiddenUpdates=Mr(null),this.identifierPrefix=l,this.onUncaughtError=n,this.onCaughtError=i,this.onRecoverableError=s,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=v,this.incompleteTransitions=new Map}function dm(e,t,a,l,n,i,s,d,v,T,_,M){return e=new Dg(e,t,a,s,v,T,_,M,d),t=1,i===!0&&(t|=24),i=gt(3,null,null,t),e.current=i,i.stateNode=e,t=xo(),t.refCount++,e.pooledCache=t,t.refCount++,i.memoizedState={element:l,isDehydrated:a,cache:t},wo(i),e}function mm(e){return e?(e=vl,e):vl}function hm(e,t,a,l,n,i){n=mm(n),l.context===null?l.context=n:l.pendingContext=n,l=xa(t),l.payload={element:a},i=i===void 0?null:i,i!==null&&(l.callback=i),a=ya(e,l,t),a!==null&&(ft(a,e,t),gn(a,e,t))}function pm(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var a=e.retryLane;e.retryLane=a!==0&&a<t?a:t}}function qs(e,t){pm(e,t),(e=e.alternate)&&pm(e,t)}function gm(e){if(e.tag===13||e.tag===31){var t=Ga(e,67108864);t!==null&&ft(t,e,67108864),qs(e,67108864)}}function vm(e){if(e.tag===13||e.tag===31){var t=St();t=Dr(t);var a=Ga(e,t);a!==null&&ft(a,e,t),qs(e,t)}}var or=!0;function Ug(e,t,a,l){var n=R.T;R.T=null;var i=X.p;try{X.p=2,Ys(e,t,a,l)}finally{X.p=i,R.T=n}}function Bg(e,t,a,l){var n=R.T;R.T=null;var i=X.p;try{X.p=8,Ys(e,t,a,l)}finally{X.p=i,R.T=n}}function Ys(e,t,a,l){if(or){var n=Gs(l);if(n===null)zs(e,t,l,sr,a),ym(e,l);else if(Lg(n,e,t,a,l))l.stopPropagation();else if(ym(e,l),t&4&&-1<kg.indexOf(e)){for(;n!==null;){var i=rl(n);if(i!==null)switch(i.tag){case 3:if(i=i.stateNode,i.current.memoizedState.isDehydrated){var s=ka(i.pendingLanes);if(s!==0){var d=i;for(d.pendingLanes|=2,d.entangledLanes|=2;s;){var v=1<<31-ht(s);d.entanglements[1]|=v,s&=~v}Gt(i),(we&6)===0&&(Vi=dt()+500,On(0))}}break;case 31:case 13:d=Ga(i,2),d!==null&&ft(d,i,2),Zi(),qs(i,2)}if(i=Gs(l),i===null&&zs(e,t,l,sr,a),i===n)break;n=i}n!==null&&l.stopPropagation()}else zs(e,t,l,null,a)}}function Gs(e){return e=Xr(e),Xs(e)}var sr=null;function Xs(e){if(sr=null,e=il(e),e!==null){var t=h(e);if(t===null)e=null;else{var a=t.tag;if(a===13){if(e=g(t),e!==null)return e;e=null}else if(a===31){if(e=w(t),e!==null)return e;e=null}else if(a===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null)}}return sr=e,null}function xm(e){switch(e){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(wh()){case Nu:return 2;case Tu:return 8;case Wn:case Eh:return 32;case zu:return 268435456;default:return 32}default:return 32}}var Vs=!1,_a=null,Ra=null,Oa=null,Hn=new Map,qn=new Map,Ma=[],kg="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function ym(e,t){switch(e){case"focusin":case"focusout":_a=null;break;case"dragenter":case"dragleave":Ra=null;break;case"mouseover":case"mouseout":Oa=null;break;case"pointerover":case"pointerout":Hn.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":qn.delete(t.pointerId)}}function Yn(e,t,a,l,n,i){return e===null||e.nativeEvent!==i?(e={blockedOn:t,domEventName:a,eventSystemFlags:l,nativeEvent:i,targetContainers:[n]},t!==null&&(t=rl(t),t!==null&&gm(t)),e):(e.eventSystemFlags|=l,t=e.targetContainers,n!==null&&t.indexOf(n)===-1&&t.push(n),e)}function Lg(e,t,a,l,n){switch(t){case"focusin":return _a=Yn(_a,e,t,a,l,n),!0;case"dragenter":return Ra=Yn(Ra,e,t,a,l,n),!0;case"mouseover":return Oa=Yn(Oa,e,t,a,l,n),!0;case"pointerover":var i=n.pointerId;return Hn.set(i,Yn(Hn.get(i)||null,e,t,a,l,n)),!0;case"gotpointercapture":return i=n.pointerId,qn.set(i,Yn(qn.get(i)||null,e,t,a,l,n)),!0}return!1}function bm(e){var t=il(e.target);if(t!==null){var a=h(t);if(a!==null){if(t=a.tag,t===13){if(t=g(a),t!==null){e.blockedOn=t,Mu(e.priority,function(){vm(a)});return}}else if(t===31){if(t=w(a),t!==null){e.blockedOn=t,Mu(e.priority,function(){vm(a)});return}}else if(t===3&&a.stateNode.current.memoizedState.isDehydrated){e.blockedOn=a.tag===3?a.stateNode.containerInfo:null;return}}}e.blockedOn=null}function ur(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var a=Gs(e.nativeEvent);if(a===null){a=e.nativeEvent;var l=new a.constructor(a.type,a);Gr=l,a.target.dispatchEvent(l),Gr=null}else return t=rl(a),t!==null&&gm(t),e.blockedOn=a,!1;t.shift()}return!0}function Sm(e,t,a){ur(e)&&a.delete(t)}function Hg(){Vs=!1,_a!==null&&ur(_a)&&(_a=null),Ra!==null&&ur(Ra)&&(Ra=null),Oa!==null&&ur(Oa)&&(Oa=null),Hn.forEach(Sm),qn.forEach(Sm)}function cr(e,t){e.blockedOn===t&&(e.blockedOn=null,Vs||(Vs=!0,r.unstable_scheduleCallback(r.unstable_NormalPriority,Hg)))}var fr=null;function wm(e){fr!==e&&(fr=e,r.unstable_scheduleCallback(r.unstable_NormalPriority,function(){fr===e&&(fr=null);for(var t=0;t<e.length;t+=3){var a=e[t],l=e[t+1],n=e[t+2];if(typeof l!="function"){if(Xs(l||a)===null)continue;break}var i=rl(a);i!==null&&(e.splice(t,3),t-=3,Go(i,{pending:!0,data:n,method:a.method,action:l},l,n))}}))}function Yl(e){function t(v){return cr(v,e)}_a!==null&&cr(_a,e),Ra!==null&&cr(Ra,e),Oa!==null&&cr(Oa,e),Hn.forEach(t),qn.forEach(t);for(var a=0;a<Ma.length;a++){var l=Ma[a];l.blockedOn===e&&(l.blockedOn=null)}for(;0<Ma.length&&(a=Ma[0],a.blockedOn===null);)bm(a),a.blockedOn===null&&Ma.shift();if(a=(e.ownerDocument||e).$$reactFormReplay,a!=null)for(l=0;l<a.length;l+=3){var n=a[l],i=a[l+1],s=n[it]||null;if(typeof i=="function")s||wm(a);else if(s){var d=null;if(i&&i.hasAttribute("formAction")){if(n=i,s=i[it]||null)d=s.formAction;else if(Xs(n)!==null)continue}else d=s.action;typeof d=="function"?a[l+1]=d:(a.splice(l,3),l-=3),wm(a)}}}function Em(){function e(i){i.canIntercept&&i.info==="react-transition"&&i.intercept({handler:function(){return new Promise(function(s){return n=s})},focusReset:"manual",scroll:"manual"})}function t(){n!==null&&(n(),n=null),l||setTimeout(a,20)}function a(){if(!l&&!navigation.transition){var i=navigation.currentEntry;i&&i.url!=null&&navigation.navigate(i.url,{state:i.getState(),info:"react-transition",history:"replace"})}}if(typeof navigation=="object"){var l=!1,n=null;return navigation.addEventListener("navigate",e),navigation.addEventListener("navigatesuccess",t),navigation.addEventListener("navigateerror",t),setTimeout(a,100),function(){l=!0,navigation.removeEventListener("navigate",e),navigation.removeEventListener("navigatesuccess",t),navigation.removeEventListener("navigateerror",t),n!==null&&(n(),n=null)}}}function Qs(e){this._internalRoot=e}dr.prototype.render=Qs.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(u(409));var a=t.current,l=St();hm(a,l,e,t,null,null)},dr.prototype.unmount=Qs.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;hm(e.current,2,null,e,null,null),Zi(),t[nl]=null}};function dr(e){this._internalRoot=e}dr.prototype.unstable_scheduleHydration=function(e){if(e){var t=Ou();e={blockedOn:null,target:e,priority:t};for(var a=0;a<Ma.length&&t!==0&&t<Ma[a].priority;a++);Ma.splice(a,0,e),a===0&&bm(e)}};var jm=c.version;if(jm!=="19.2.6")throw Error(u(527,jm,"19.2.6"));X.findDOMNode=function(e){var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(u(188)):(e=Object.keys(e).join(","),Error(u(268,e)));return e=p(t),e=e!==null?z(e):null,e=e===null?null:e.stateNode,e};var qg={bundleType:0,version:"19.2.6",rendererPackageName:"react-dom",currentDispatcherRef:R,reconcilerVersion:"19.2.6"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var mr=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!mr.isDisabled&&mr.supportsFiber)try{$l=mr.inject(qg),mt=mr}catch{}}return Xn.createRoot=function(e,t){if(!m(e))throw Error(u(299));var a=!1,l="",n=Rf,i=Of,s=Mf;return t!=null&&(t.unstable_strictMode===!0&&(a=!0),t.identifierPrefix!==void 0&&(l=t.identifierPrefix),t.onUncaughtError!==void 0&&(n=t.onUncaughtError),t.onCaughtError!==void 0&&(i=t.onCaughtError),t.onRecoverableError!==void 0&&(s=t.onRecoverableError)),t=dm(e,1,!1,null,null,a,l,null,n,i,s,Em),e[nl]=t.current,Ts(e),new Qs(t)},Xn.hydrateRoot=function(e,t,a){if(!m(e))throw Error(u(299));var l=!1,n="",i=Rf,s=Of,d=Mf,v=null;return a!=null&&(a.unstable_strictMode===!0&&(l=!0),a.identifierPrefix!==void 0&&(n=a.identifierPrefix),a.onUncaughtError!==void 0&&(i=a.onUncaughtError),a.onCaughtError!==void 0&&(s=a.onCaughtError),a.onRecoverableError!==void 0&&(d=a.onRecoverableError),a.formState!==void 0&&(v=a.formState)),t=dm(e,1,!0,t,a??null,l,n,v,i,s,d,Em),t.context=mm(null),a=t.current,l=St(),l=Dr(l),n=xa(l),n.callback=null,ya(a,n,l),a=l,t.current.lanes=a,Wl(t,a),Gt(t),e[nl]=t.current,Ts(e),new dr(t)},Xn.version="19.2.6",Xn}var Dm;function Fg(){if(Dm)return Js.exports;Dm=1;function r(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r)}catch(c){console.error(c)}}return r(),Js.exports=$g(),Js.exports}var Wg=Fg();/**
 * react-router v7.15.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var Um="popstate";function Bm(r){return typeof r=="object"&&r!=null&&"pathname"in r&&"search"in r&&"hash"in r&&"state"in r&&"key"in r}function Ig(r={}){function c(u,m){var p;let h=(p=m.state)==null?void 0:p.masked,{pathname:g,search:w,hash:y}=h||u.location;return uu("",{pathname:g,search:w,hash:y},m.state&&m.state.usr||null,m.state&&m.state.key||"default",h?{pathname:u.location.pathname,search:u.location.search,hash:u.location.hash}:void 0)}function f(u,m){return typeof m=="string"?m:Qn(m)}return e0(c,f,null,r)}function Be(r,c){if(r===!1||r===null||typeof r>"u")throw new Error(c)}function Lt(r,c){if(!r){typeof console<"u"&&console.warn(c);try{throw new Error(c)}catch{}}}function Pg(){return Math.random().toString(36).substring(2,10)}function km(r,c){return{usr:r.state,key:r.key,idx:c,masked:r.mask?{pathname:r.pathname,search:r.search,hash:r.hash}:void 0}}function uu(r,c,f=null,u,m){return{pathname:typeof r=="string"?r:r.pathname,search:"",hash:"",...typeof c=="string"?Vl(c):c,state:f,key:c&&c.key||u||Pg(),mask:m}}function Qn({pathname:r="/",search:c="",hash:f=""}){return c&&c!=="?"&&(r+=c.charAt(0)==="?"?c:"?"+c),f&&f!=="#"&&(r+=f.charAt(0)==="#"?f:"#"+f),r}function Vl(r){let c={};if(r){let f=r.indexOf("#");f>=0&&(c.hash=r.substring(f),r=r.substring(0,f));let u=r.indexOf("?");u>=0&&(c.search=r.substring(u),r=r.substring(0,u)),r&&(c.pathname=r)}return c}function e0(r,c,f,u={}){let{window:m=document.defaultView,v5Compat:h=!1}=u,g=m.history,w="POP",y=null,p=z();p==null&&(p=0,g.replaceState({...g.state,idx:p},""));function z(){return(g.state||{idx:null}).idx}function E(){w="POP";let H=z(),U=H==null?null:H-p;p=H,y&&y({action:w,location:k.location,delta:U})}function D(H,U){w="PUSH";let J=Bm(H)?H:uu(k.location,H,U);p=z()+1;let L=km(J,p),F=k.createHref(J.mask||J);try{g.pushState(L,"",F)}catch(K){if(K instanceof DOMException&&K.name==="DataCloneError")throw K;m.location.assign(F)}h&&y&&y({action:w,location:k.location,delta:1})}function Y(H,U){w="REPLACE";let J=Bm(H)?H:uu(k.location,H,U);p=z();let L=km(J,p),F=k.createHref(J.mask||J);g.replaceState(L,"",F),h&&y&&y({action:w,location:k.location,delta:0})}function q(H){return t0(H)}let k={get action(){return w},get location(){return r(m,g)},listen(H){if(y)throw new Error("A history only accepts one active listener");return m.addEventListener(Um,E),y=H,()=>{m.removeEventListener(Um,E),y=null}},createHref(H){return c(m,H)},createURL:q,encodeLocation(H){let U=q(H);return{pathname:U.pathname,search:U.search,hash:U.hash}},push:D,replace:Y,go(H){return g.go(H)}};return k}function t0(r,c=!1){let f="http://localhost";typeof window<"u"&&(f=window.location.origin!=="null"?window.location.origin:window.location.href),Be(f,"No window.location.(origin|href) available to create URL");let u=typeof r=="string"?r:Qn(r);return u=u.replace(/ $/,"%20"),!c&&u.startsWith("//")&&(u=f+u),new URL(u,f)}function Fm(r,c,f="/"){return a0(r,c,f,!1)}function a0(r,c,f,u,m){let h=typeof c=="string"?Vl(c):c,g=ua(h.pathname||"/",f);if(g==null)return null;let w=l0(r),y=null,p=p0(g);for(let z=0;y==null&&z<w.length;++z)y=m0(w[z],p,u);return y}function l0(r){let c=Wm(r);return n0(c),c}function Wm(r,c=[],f=[],u="",m=!1){let h=(g,w,y=m,p)=>{let z={relativePath:p===void 0?g.path||"":p,caseSensitive:g.caseSensitive===!0,childrenIndex:w,route:g};if(z.relativePath.startsWith("/")){if(!z.relativePath.startsWith(u)&&y)return;Be(z.relativePath.startsWith(u),`Absolute route path "${z.relativePath}" nested under path "${u}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),z.relativePath=z.relativePath.slice(u.length)}let E=kt([u,z.relativePath]),D=f.concat(z);g.children&&g.children.length>0&&(Be(g.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${E}".`),Wm(g.children,c,D,E,y)),!(g.path==null&&!g.index)&&c.push({path:E,score:f0(E,g.index),routesMeta:D})};return r.forEach((g,w)=>{var y;if(g.path===""||!((y=g.path)!=null&&y.includes("?")))h(g,w);else for(let p of Im(g.path))h(g,w,!0,p)}),c}function Im(r){let c=r.split("/");if(c.length===0)return[];let[f,...u]=c,m=f.endsWith("?"),h=f.replace(/\?$/,"");if(u.length===0)return m?[h,""]:[h];let g=Im(u.join("/")),w=[];return w.push(...g.map(y=>y===""?h:[h,y].join("/"))),m&&w.push(...g),w.map(y=>r.startsWith("/")&&y===""?"/":y)}function n0(r){r.sort((c,f)=>c.score!==f.score?f.score-c.score:d0(c.routesMeta.map(u=>u.childrenIndex),f.routesMeta.map(u=>u.childrenIndex)))}var i0=/^:[\w-]+$/,r0=3,o0=2,s0=1,u0=10,c0=-2,Lm=r=>r==="*";function f0(r,c){let f=r.split("/"),u=f.length;return f.some(Lm)&&(u+=c0),c&&(u+=o0),f.filter(m=>!Lm(m)).reduce((m,h)=>m+(i0.test(h)?r0:h===""?s0:u0),u)}function d0(r,c){return r.length===c.length&&r.slice(0,-1).every((u,m)=>u===c[m])?r[r.length-1]-c[c.length-1]:0}function m0(r,c,f=!1){let{routesMeta:u}=r,m={},h="/",g=[];for(let w=0;w<u.length;++w){let y=u[w],p=w===u.length-1,z=h==="/"?c:c.slice(h.length)||"/",E=Sr({path:y.relativePath,caseSensitive:y.caseSensitive,end:p},z),D=y.route;if(!E&&p&&f&&!u[u.length-1].route.index&&(E=Sr({path:y.relativePath,caseSensitive:y.caseSensitive,end:!1},z)),!E)return null;Object.assign(m,E.params),g.push({params:m,pathname:kt([h,E.pathname]),pathnameBase:y0(kt([h,E.pathnameBase])),route:D}),E.pathnameBase!=="/"&&(h=kt([h,E.pathnameBase]))}return g}function Sr(r,c){typeof r=="string"&&(r={path:r,caseSensitive:!1,end:!0});let[f,u]=h0(r.path,r.caseSensitive,r.end),m=c.match(f);if(!m)return null;let h=m[0],g=h.replace(/(.)\/+$/,"$1"),w=m.slice(1);return{params:u.reduce((p,{paramName:z,isOptional:E},D)=>{if(z==="*"){let q=w[D]||"";g=h.slice(0,h.length-q.length).replace(/(.)\/+$/,"$1")}const Y=w[D];return E&&!Y?p[z]=void 0:p[z]=(Y||"").replace(/%2F/g,"/"),p},{}),pathname:h,pathnameBase:g,pattern:r}}function h0(r,c=!1,f=!0){Lt(r==="*"||!r.endsWith("*")||r.endsWith("/*"),`Route path "${r}" will be treated as if it were "${r.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${r.replace(/\*$/,"/*")}".`);let u=[],m="^"+r.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(g,w,y,p,z)=>{if(u.push({paramName:w,isOptional:y!=null}),y){let E=z.charAt(p+g.length);return E&&E!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return r.endsWith("*")?(u.push({paramName:"*"}),m+=r==="*"||r==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):f?m+="\\/*$":r!==""&&r!=="/"&&(m+="(?:(?=\\/|$))"),[new RegExp(m,c?void 0:"i"),u]}function p0(r){try{return r.split("/").map(c=>decodeURIComponent(c).replace(/\//g,"%2F")).join("/")}catch(c){return Lt(!1,`The URL path "${r}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${c}).`),r}}function ua(r,c){if(c==="/")return r;if(!r.toLowerCase().startsWith(c.toLowerCase()))return null;let f=c.endsWith("/")?c.length-1:c.length,u=r.charAt(f);return u&&u!=="/"?null:r.slice(f)||"/"}var g0=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;function v0(r,c="/"){let{pathname:f,search:u="",hash:m=""}=typeof r=="string"?Vl(r):r,h;return f?(f=Pm(f),f.startsWith("/")?h=Hm(f.substring(1),"/"):h=Hm(f,c)):h=c,{pathname:h,search:b0(u),hash:S0(m)}}function Hm(r,c){let f=wr(c).split("/");return r.split("/").forEach(m=>{m===".."?f.length>1&&f.pop():m!=="."&&f.push(m)}),f.length>1?f.join("/"):"/"}function Is(r,c,f,u){return`Cannot include a '${r}' character in a manually specified \`to.${c}\` field [${JSON.stringify(u)}].  Please separate it out to the \`to.${f}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function x0(r){return r.filter((c,f)=>f===0||c.route.path&&c.route.path.length>0)}function pu(r){let c=x0(r);return c.map((f,u)=>u===c.length-1?f.pathname:f.pathnameBase)}function Er(r,c,f,u=!1){let m;typeof r=="string"?m=Vl(r):(m={...r},Be(!m.pathname||!m.pathname.includes("?"),Is("?","pathname","search",m)),Be(!m.pathname||!m.pathname.includes("#"),Is("#","pathname","hash",m)),Be(!m.search||!m.search.includes("#"),Is("#","search","hash",m)));let h=r===""||m.pathname==="",g=h?"/":m.pathname,w;if(g==null)w=f;else{let E=c.length-1;if(!u&&g.startsWith("..")){let D=g.split("/");for(;D[0]==="..";)D.shift(),E-=1;m.pathname=D.join("/")}w=E>=0?c[E]:"/"}let y=v0(m,w),p=g&&g!=="/"&&g.endsWith("/"),z=(h||g===".")&&f.endsWith("/");return!y.pathname.endsWith("/")&&(p||z)&&(y.pathname+="/"),y}var Pm=r=>r.replace(/\/\/+/g,"/"),kt=r=>Pm(r.join("/")),wr=r=>r.replace(/\/+$/,""),y0=r=>wr(r).replace(/^\/*/,"/"),b0=r=>!r||r==="?"?"":r.startsWith("?")?r:"?"+r,S0=r=>!r||r==="#"?"":r.startsWith("#")?r:"#"+r,w0=class{constructor(r,c,f,u=!1){this.status=r,this.statusText=c||"",this.internal=u,f instanceof Error?(this.data=f.toString(),this.error=f):this.data=f}};function E0(r){return r!=null&&typeof r.status=="number"&&typeof r.statusText=="string"&&typeof r.internal=="boolean"&&"data"in r}function j0(r){let c=r.map(f=>f.route.path).filter(Boolean);return kt(c)||"/"}var eh=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function th(r,c){let f=r;if(typeof f!="string"||!g0.test(f))return{absoluteURL:void 0,isExternal:!1,to:f};let u=f,m=!1;if(eh)try{let h=new URL(window.location.href),g=f.startsWith("//")?new URL(h.protocol+f):new URL(f),w=ua(g.pathname,c);g.origin===h.origin&&w!=null?f=w+g.search+g.hash:m=!0}catch{Lt(!1,`<Link to="${f}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:u,isExternal:m,to:f}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var ah=["POST","PUT","PATCH","DELETE"];new Set(ah);var N0=["GET",...ah];new Set(N0);var Ql=x.createContext(null);Ql.displayName="DataRouter";var jr=x.createContext(null);jr.displayName="DataRouterState";var lh=x.createContext(!1);function T0(){return x.useContext(lh)}var nh=x.createContext({isTransitioning:!1});nh.displayName="ViewTransition";var z0=x.createContext(new Map);z0.displayName="Fetchers";var A0=x.createContext(null);A0.displayName="Await";var wt=x.createContext(null);wt.displayName="Navigation";var Zn=x.createContext(null);Zn.displayName="Location";var Xt=x.createContext({outlet:null,matches:[],isDataRoute:!1});Xt.displayName="Route";var gu=x.createContext(null);gu.displayName="RouteError";var ih="REACT_ROUTER_ERROR",C0="REDIRECT",_0="ROUTE_ERROR_RESPONSE";function R0(r){if(r.startsWith(`${ih}:${C0}:{`))try{let c=JSON.parse(r.slice(28));if(typeof c=="object"&&c&&typeof c.status=="number"&&typeof c.statusText=="string"&&typeof c.location=="string"&&typeof c.reloadDocument=="boolean"&&typeof c.replace=="boolean")return c}catch{}}function O0(r){if(r.startsWith(`${ih}:${_0}:{`))try{let c=JSON.parse(r.slice(40));if(typeof c=="object"&&c&&typeof c.status=="number"&&typeof c.statusText=="string")return new w0(c.status,c.statusText,c.data)}catch{}}function M0(r,{relative:c}={}){Be(Zl(),"useHref() may be used only in the context of a <Router> component.");let{basename:f,navigator:u}=x.useContext(wt),{hash:m,pathname:h,search:g}=Kn(r,{relative:c}),w=h;return f!=="/"&&(w=h==="/"?f:kt([f,h])),u.createHref({pathname:w,search:g,hash:m})}function Zl(){return x.useContext(Zn)!=null}function Vt(){return Be(Zl(),"useLocation() may be used only in the context of a <Router> component."),x.useContext(Zn).location}var rh="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function oh(r){x.useContext(wt).static||x.useLayoutEffect(r)}function tl(){let{isDataRoute:r}=x.useContext(Xt);return r?Z0():D0()}function D0(){Be(Zl(),"useNavigate() may be used only in the context of a <Router> component.");let r=x.useContext(Ql),{basename:c,navigator:f}=x.useContext(wt),{matches:u}=x.useContext(Xt),{pathname:m}=Vt(),h=JSON.stringify(pu(u)),g=x.useRef(!1);return oh(()=>{g.current=!0}),x.useCallback((y,p={})=>{if(Lt(g.current,rh),!g.current)return;if(typeof y=="number"){f.go(y);return}let z=Er(y,JSON.parse(h),m,p.relative==="path");r==null&&c!=="/"&&(z.pathname=z.pathname==="/"?c:kt([c,z.pathname])),(p.replace?f.replace:f.push)(z,p.state,p)},[c,f,h,m,r])}x.createContext(null);function Kn(r,{relative:c}={}){let{matches:f}=x.useContext(Xt),{pathname:u}=Vt(),m=JSON.stringify(pu(f));return x.useMemo(()=>Er(r,JSON.parse(m),u,c==="path"),[r,m,u,c])}function U0(r,c){return sh(r,c)}function sh(r,c,f){var H;Be(Zl(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:u}=x.useContext(wt),{matches:m}=x.useContext(Xt),h=m[m.length-1],g=h?h.params:{},w=h?h.pathname:"/",y=h?h.pathnameBase:"/",p=h&&h.route;{let U=p&&p.path||"";ch(w,!p||U.endsWith("*")||U.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${w}" (under <Route path="${U}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${U}"> to <Route path="${U==="/"?"*":`${U}/*`}">.`)}let z=Vt(),E;if(c){let U=typeof c=="string"?Vl(c):c;Be(y==="/"||((H=U.pathname)==null?void 0:H.startsWith(y)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${y}" but pathname "${U.pathname}" was given in the \`location\` prop.`),E=U}else E=z;let D=E.pathname||"/",Y=D;if(y!=="/"){let U=y.replace(/^\//,"").split("/");Y="/"+D.replace(/^\//,"").split("/").slice(U.length).join("/")}let q=f&&f.state.matches.length?f.state.matches.map(U=>Object.assign(U,{route:f.manifest[U.route.id]||U.route})):Fm(r,{pathname:Y});Lt(p||q!=null,`No routes matched location "${E.pathname}${E.search}${E.hash}" `),Lt(q==null||q[q.length-1].route.element!==void 0||q[q.length-1].route.Component!==void 0||q[q.length-1].route.lazy!==void 0,`Matched leaf route at location "${E.pathname}${E.search}${E.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let k=q0(q&&q.map(U=>Object.assign({},U,{params:Object.assign({},g,U.params),pathname:kt([y,u.encodeLocation?u.encodeLocation(U.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:U.pathname]),pathnameBase:U.pathnameBase==="/"?y:kt([y,u.encodeLocation?u.encodeLocation(U.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:U.pathnameBase])})),m,f);return c&&k?x.createElement(Zn.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...E},navigationType:"POP"}},k):k}function B0(){let r=Q0(),c=E0(r)?`${r.status} ${r.statusText}`:r instanceof Error?r.message:JSON.stringify(r),f=r instanceof Error?r.stack:null,u="rgba(200,200,200, 0.5)",m={padding:"0.5rem",backgroundColor:u},h={padding:"2px 4px",backgroundColor:u},g=null;return console.error("Error handled by React Router default ErrorBoundary:",r),g=x.createElement(x.Fragment,null,x.createElement("p",null,"💿 Hey developer 👋"),x.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",x.createElement("code",{style:h},"ErrorBoundary")," or"," ",x.createElement("code",{style:h},"errorElement")," prop on your route.")),x.createElement(x.Fragment,null,x.createElement("h2",null,"Unexpected Application Error!"),x.createElement("h3",{style:{fontStyle:"italic"}},c),f?x.createElement("pre",{style:m},f):null,g)}var k0=x.createElement(B0,null),uh=class extends x.Component{constructor(r){super(r),this.state={location:r.location,revalidation:r.revalidation,error:r.error}}static getDerivedStateFromError(r){return{error:r}}static getDerivedStateFromProps(r,c){return c.location!==r.location||c.revalidation!=="idle"&&r.revalidation==="idle"?{error:r.error,location:r.location,revalidation:r.revalidation}:{error:r.error!==void 0?r.error:c.error,location:c.location,revalidation:r.revalidation||c.revalidation}}componentDidCatch(r,c){this.props.onError?this.props.onError(r,c):console.error("React Router caught the following error during render",r)}render(){let r=this.state.error;if(this.context&&typeof r=="object"&&r&&"digest"in r&&typeof r.digest=="string"){const f=O0(r.digest);f&&(r=f)}let c=r!==void 0?x.createElement(Xt.Provider,{value:this.props.routeContext},x.createElement(gu.Provider,{value:r,children:this.props.component})):this.props.children;return this.context?x.createElement(L0,{error:r},c):c}};uh.contextType=lh;var Ps=new WeakMap;function L0({children:r,error:c}){let{basename:f}=x.useContext(wt);if(typeof c=="object"&&c&&"digest"in c&&typeof c.digest=="string"){let u=R0(c.digest);if(u){let m=Ps.get(c);if(m)throw m;let h=th(u.location,f);if(eh&&!Ps.get(c))if(h.isExternal||u.reloadDocument)window.location.href=h.absoluteURL||h.to;else{const g=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(h.to,{replace:u.replace}));throw Ps.set(c,g),g}return x.createElement("meta",{httpEquiv:"refresh",content:`0;url=${h.absoluteURL||h.to}`})}}return r}function H0({routeContext:r,match:c,children:f}){let u=x.useContext(Ql);return u&&u.static&&u.staticContext&&(c.route.errorElement||c.route.ErrorBoundary)&&(u.staticContext._deepestRenderedBoundaryId=c.route.id),x.createElement(Xt.Provider,{value:r},f)}function q0(r,c=[],f){let u=f==null?void 0:f.state;if(r==null){if(!u)return null;if(u.errors)r=u.matches;else if(c.length===0&&!u.initialized&&u.matches.length>0)r=u.matches;else return null}let m=r,h=u==null?void 0:u.errors;if(h!=null){let z=m.findIndex(E=>E.route.id&&(h==null?void 0:h[E.route.id])!==void 0);Be(z>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(h).join(",")}`),m=m.slice(0,Math.min(m.length,z+1))}let g=!1,w=-1;if(f&&u){g=u.renderFallback;for(let z=0;z<m.length;z++){let E=m[z];if((E.route.HydrateFallback||E.route.hydrateFallbackElement)&&(w=z),E.route.id){let{loaderData:D,errors:Y}=u,q=E.route.loader&&!D.hasOwnProperty(E.route.id)&&(!Y||Y[E.route.id]===void 0);if(E.route.lazy||q){f.isStatic&&(g=!0),w>=0?m=m.slice(0,w+1):m=[m[0]];break}}}}let y=f==null?void 0:f.onError,p=u&&y?(z,E)=>{var D,Y;y(z,{location:u.location,params:((Y=(D=u.matches)==null?void 0:D[0])==null?void 0:Y.params)??{},pattern:j0(u.matches),errorInfo:E})}:void 0;return m.reduceRight((z,E,D)=>{let Y,q=!1,k=null,H=null;u&&(Y=h&&E.route.id?h[E.route.id]:void 0,k=E.route.errorElement||k0,g&&(w<0&&D===0?(ch("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),q=!0,H=null):w===D&&(q=!0,H=E.route.hydrateFallbackElement||null)));let U=c.concat(m.slice(0,D+1)),J=()=>{let L;return Y?L=k:q?L=H:E.route.Component?L=x.createElement(E.route.Component,null):E.route.element?L=E.route.element:L=z,x.createElement(H0,{match:E,routeContext:{outlet:z,matches:U,isDataRoute:u!=null},children:L})};return u&&(E.route.ErrorBoundary||E.route.errorElement||D===0)?x.createElement(uh,{location:u.location,revalidation:u.revalidation,component:k,error:Y,children:J(),routeContext:{outlet:null,matches:U,isDataRoute:!0},onError:p}):J()},null)}function vu(r){return`${r} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Y0(r){let c=x.useContext(Ql);return Be(c,vu(r)),c}function G0(r){let c=x.useContext(jr);return Be(c,vu(r)),c}function X0(r){let c=x.useContext(Xt);return Be(c,vu(r)),c}function xu(r){let c=X0(r),f=c.matches[c.matches.length-1];return Be(f.route.id,`${r} can only be used on routes that contain a unique "id"`),f.route.id}function V0(){return xu("useRouteId")}function Q0(){var u;let r=x.useContext(gu),c=G0("useRouteError"),f=xu("useRouteError");return r!==void 0?r:(u=c.errors)==null?void 0:u[f]}function Z0(){let{router:r}=Y0("useNavigate"),c=xu("useNavigate"),f=x.useRef(!1);return oh(()=>{f.current=!0}),x.useCallback(async(m,h={})=>{Lt(f.current,rh),f.current&&(typeof m=="number"?await r.navigate(m):await r.navigate(m,{fromRouteId:c,...h}))},[r,c])}var qm={};function ch(r,c,f){!c&&!qm[r]&&(qm[r]=!0,Lt(!1,f))}x.memo(K0);function K0({routes:r,manifest:c,future:f,state:u,isStatic:m,onError:h}){return sh(r,void 0,{manifest:c,state:u,isStatic:m,onError:h})}function Ym({to:r,replace:c,state:f,relative:u}){Be(Zl(),"<Navigate> may be used only in the context of a <Router> component.");let{static:m}=x.useContext(wt);Lt(!m,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:h}=x.useContext(Xt),{pathname:g}=Vt(),w=tl(),y=Er(r,pu(h),g,u==="path"),p=JSON.stringify(y);return x.useEffect(()=>{w(JSON.parse(p),{replace:c,state:f,relative:u})},[w,p,u,c,f]),null}function lt(r){Be(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function J0({basename:r="/",children:c=null,location:f,navigationType:u="POP",navigator:m,static:h=!1,useTransitions:g}){Be(!Zl(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let w=r.replace(/^\/*/,"/"),y=x.useMemo(()=>({basename:w,navigator:m,static:h,useTransitions:g,future:{}}),[w,m,h,g]);typeof f=="string"&&(f=Vl(f));let{pathname:p="/",search:z="",hash:E="",state:D=null,key:Y="default",mask:q}=f,k=x.useMemo(()=>{let H=ua(p,w);return H==null?null:{location:{pathname:H,search:z,hash:E,state:D,key:Y,mask:q},navigationType:u}},[w,p,z,E,D,Y,u,q]);return Lt(k!=null,`<Router basename="${w}"> is not able to match the URL "${p}${z}${E}" because it does not start with the basename, so the <Router> won't render anything.`),k==null?null:x.createElement(wt.Provider,{value:y},x.createElement(Zn.Provider,{children:c,value:k}))}function $0({children:r,location:c}){return U0(cu(r),c)}function cu(r,c=[]){let f=[];return x.Children.forEach(r,(u,m)=>{if(!x.isValidElement(u))return;let h=[...c,m];if(u.type===x.Fragment){f.push.apply(f,cu(u.props.children,h));return}Be(u.type===lt,`[${typeof u.type=="string"?u.type:u.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),Be(!u.props.index||!u.props.children,"An index route cannot have child routes.");let g={id:u.props.id||h.join("-"),caseSensitive:u.props.caseSensitive,element:u.props.element,Component:u.props.Component,index:u.props.index,path:u.props.path,middleware:u.props.middleware,loader:u.props.loader,action:u.props.action,hydrateFallbackElement:u.props.hydrateFallbackElement,HydrateFallback:u.props.HydrateFallback,errorElement:u.props.errorElement,ErrorBoundary:u.props.ErrorBoundary,hasErrorBoundary:u.props.hasErrorBoundary===!0||u.props.ErrorBoundary!=null||u.props.errorElement!=null,shouldRevalidate:u.props.shouldRevalidate,handle:u.props.handle,lazy:u.props.lazy};u.props.children&&(g.children=cu(u.props.children,h)),f.push(g)}),f}var xr="get",yr="application/x-www-form-urlencoded";function Nr(r){return typeof HTMLElement<"u"&&r instanceof HTMLElement}function F0(r){return Nr(r)&&r.tagName.toLowerCase()==="button"}function W0(r){return Nr(r)&&r.tagName.toLowerCase()==="form"}function I0(r){return Nr(r)&&r.tagName.toLowerCase()==="input"}function P0(r){return!!(r.metaKey||r.altKey||r.ctrlKey||r.shiftKey)}function ev(r,c){return r.button===0&&(!c||c==="_self")&&!P0(r)}var hr=null;function tv(){if(hr===null)try{new FormData(document.createElement("form"),0),hr=!1}catch{hr=!0}return hr}var av=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function eu(r){return r!=null&&!av.has(r)?(Lt(!1,`"${r}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${yr}"`),null):r}function lv(r,c){let f,u,m,h,g;if(W0(r)){let w=r.getAttribute("action");u=w?ua(w,c):null,f=r.getAttribute("method")||xr,m=eu(r.getAttribute("enctype"))||yr,h=new FormData(r)}else if(F0(r)||I0(r)&&(r.type==="submit"||r.type==="image")){let w=r.form;if(w==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let y=r.getAttribute("formaction")||w.getAttribute("action");if(u=y?ua(y,c):null,f=r.getAttribute("formmethod")||w.getAttribute("method")||xr,m=eu(r.getAttribute("formenctype"))||eu(w.getAttribute("enctype"))||yr,h=new FormData(w,r),!tv()){let{name:p,type:z,value:E}=r;if(z==="image"){let D=p?`${p}.`:"";h.append(`${D}x`,"0"),h.append(`${D}y`,"0")}else p&&h.append(p,E)}}else{if(Nr(r))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');f=xr,u=null,m=yr,g=r}return h&&m==="text/plain"&&(g=h,h=void 0),{action:u,method:f.toLowerCase(),encType:m,formData:h,body:g}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function yu(r,c){if(r===!1||r===null||typeof r>"u")throw new Error(c)}function fh(r,c,f,u){let m=typeof r=="string"?new URL(r,typeof window>"u"?"server://singlefetch/":window.location.origin):r;return f?m.pathname.endsWith("/")?m.pathname=`${m.pathname}_.${u}`:m.pathname=`${m.pathname}.${u}`:m.pathname==="/"?m.pathname=`_root.${u}`:c&&ua(m.pathname,c)==="/"?m.pathname=`${wr(c)}/_root.${u}`:m.pathname=`${wr(m.pathname)}.${u}`,m}async function nv(r,c){if(r.id in c)return c[r.id];try{let f=await import(r.module);return c[r.id]=f,f}catch(f){return console.error(`Error loading route module \`${r.module}\`, reloading page...`),console.error(f),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function iv(r){return r==null?!1:r.href==null?r.rel==="preload"&&typeof r.imageSrcSet=="string"&&typeof r.imageSizes=="string":typeof r.rel=="string"&&typeof r.href=="string"}async function rv(r,c,f){let u=await Promise.all(r.map(async m=>{let h=c.routes[m.route.id];if(h){let g=await nv(h,f);return g.links?g.links():[]}return[]}));return cv(u.flat(1).filter(iv).filter(m=>m.rel==="stylesheet"||m.rel==="preload").map(m=>m.rel==="stylesheet"?{...m,rel:"prefetch",as:"style"}:{...m,rel:"prefetch"}))}function Gm(r,c,f,u,m,h){let g=(y,p)=>f[p]?y.route.id!==f[p].route.id:!0,w=(y,p)=>{var z;return f[p].pathname!==y.pathname||((z=f[p].route.path)==null?void 0:z.endsWith("*"))&&f[p].params["*"]!==y.params["*"]};return h==="assets"?c.filter((y,p)=>g(y,p)||w(y,p)):h==="data"?c.filter((y,p)=>{var E;let z=u.routes[y.route.id];if(!z||!z.hasLoader)return!1;if(g(y,p)||w(y,p))return!0;if(y.route.shouldRevalidate){let D=y.route.shouldRevalidate({currentUrl:new URL(m.pathname+m.search+m.hash,window.origin),currentParams:((E=f[0])==null?void 0:E.params)||{},nextUrl:new URL(r,window.origin),nextParams:y.params,defaultShouldRevalidate:!0});if(typeof D=="boolean")return D}return!0}):[]}function ov(r,c,{includeHydrateFallback:f}={}){return sv(r.map(u=>{let m=c.routes[u.route.id];if(!m)return[];let h=[m.module];return m.clientActionModule&&(h=h.concat(m.clientActionModule)),m.clientLoaderModule&&(h=h.concat(m.clientLoaderModule)),f&&m.hydrateFallbackModule&&(h=h.concat(m.hydrateFallbackModule)),m.imports&&(h=h.concat(m.imports)),h}).flat(1))}function sv(r){return[...new Set(r)]}function uv(r){let c={},f=Object.keys(r).sort();for(let u of f)c[u]=r[u];return c}function cv(r,c){let f=new Set;return new Set(c),r.reduce((u,m)=>{let h=JSON.stringify(uv(m));return f.has(h)||(f.add(h),u.push({key:h,link:m})),u},[])}function bu(){let r=x.useContext(Ql);return yu(r,"You must render this element inside a <DataRouterContext.Provider> element"),r}function fv(){let r=x.useContext(jr);return yu(r,"You must render this element inside a <DataRouterStateContext.Provider> element"),r}var Su=x.createContext(void 0);Su.displayName="FrameworkContext";function wu(){let r=x.useContext(Su);return yu(r,"You must render this element inside a <HydratedRouter> element"),r}function dv(r,c){let f=x.useContext(Su),[u,m]=x.useState(!1),[h,g]=x.useState(!1),{onFocus:w,onBlur:y,onMouseEnter:p,onMouseLeave:z,onTouchStart:E}=c,D=x.useRef(null);x.useEffect(()=>{if(r==="render"&&g(!0),r==="viewport"){let k=U=>{U.forEach(J=>{g(J.isIntersecting)})},H=new IntersectionObserver(k,{threshold:.5});return D.current&&H.observe(D.current),()=>{H.disconnect()}}},[r]),x.useEffect(()=>{if(u){let k=setTimeout(()=>{g(!0)},100);return()=>{clearTimeout(k)}}},[u]);let Y=()=>{m(!0)},q=()=>{m(!1),g(!1)};return f?r!=="intent"?[h,D,{}]:[h,D,{onFocus:Vn(w,Y),onBlur:Vn(y,q),onMouseEnter:Vn(p,Y),onMouseLeave:Vn(z,q),onTouchStart:Vn(E,Y)}]:[!1,D,{}]}function Vn(r,c){return f=>{r&&r(f),f.defaultPrevented||c(f)}}function mv({page:r,...c}){let f=T0(),{router:u}=bu(),m=x.useMemo(()=>Fm(u.routes,r,u.basename),[u.routes,r,u.basename]);return m?f?x.createElement(pv,{page:r,matches:m,...c}):x.createElement(gv,{page:r,matches:m,...c}):null}function hv(r){let{manifest:c,routeModules:f}=wu(),[u,m]=x.useState([]);return x.useEffect(()=>{let h=!1;return rv(r,c,f).then(g=>{h||m(g)}),()=>{h=!0}},[r,c,f]),u}function pv({page:r,matches:c,...f}){let u=Vt(),{future:m}=wu(),{basename:h}=bu(),g=x.useMemo(()=>{if(r===u.pathname+u.search+u.hash)return[];let w=fh(r,h,m.unstable_trailingSlashAwareDataRequests,"rsc"),y=!1,p=[];for(let z of c)typeof z.route.shouldRevalidate=="function"?y=!0:p.push(z.route.id);return y&&p.length>0&&w.searchParams.set("_routes",p.join(",")),[w.pathname+w.search]},[h,m.unstable_trailingSlashAwareDataRequests,r,u,c]);return x.createElement(x.Fragment,null,g.map(w=>x.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...f})))}function gv({page:r,matches:c,...f}){let u=Vt(),{future:m,manifest:h,routeModules:g}=wu(),{basename:w}=bu(),{loaderData:y,matches:p}=fv(),z=x.useMemo(()=>Gm(r,c,p,h,u,"data"),[r,c,p,h,u]),E=x.useMemo(()=>Gm(r,c,p,h,u,"assets"),[r,c,p,h,u]),D=x.useMemo(()=>{if(r===u.pathname+u.search+u.hash)return[];let k=new Set,H=!1;if(c.forEach(J=>{var F;let L=h.routes[J.route.id];!L||!L.hasLoader||(!z.some(K=>K.route.id===J.route.id)&&J.route.id in y&&((F=g[J.route.id])!=null&&F.shouldRevalidate)||L.hasClientLoader?H=!0:k.add(J.route.id))}),k.size===0)return[];let U=fh(r,w,m.unstable_trailingSlashAwareDataRequests,"data");return H&&k.size>0&&U.searchParams.set("_routes",c.filter(J=>k.has(J.route.id)).map(J=>J.route.id).join(",")),[U.pathname+U.search]},[w,m.unstable_trailingSlashAwareDataRequests,y,u,h,z,c,r,g]),Y=x.useMemo(()=>ov(E,h),[E,h]),q=hv(E);return x.createElement(x.Fragment,null,D.map(k=>x.createElement("link",{key:k,rel:"prefetch",as:"fetch",href:k,...f})),Y.map(k=>x.createElement("link",{key:k,rel:"modulepreload",href:k,...f})),q.map(({key:k,link:H})=>x.createElement("link",{key:k,nonce:f.nonce,...H,crossOrigin:H.crossOrigin??f.crossOrigin})))}function vv(...r){return c=>{r.forEach(f=>{typeof f=="function"?f(c):f!=null&&(f.current=c)})}}var xv=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{xv&&(window.__reactRouterVersion="7.15.1")}catch{}function yv({basename:r,children:c,useTransitions:f,window:u}){let m=x.useRef();m.current==null&&(m.current=Ig({window:u,v5Compat:!0}));let h=m.current,[g,w]=x.useState({action:h.action,location:h.location}),y=x.useCallback(p=>{f===!1?w(p):x.startTransition(()=>w(p))},[f]);return x.useLayoutEffect(()=>h.listen(y),[h,y]),x.createElement(J0,{basename:r,children:c,location:g.location,navigationType:g.action,navigator:h,useTransitions:f})}var dh=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,Oe=x.forwardRef(function({onClick:c,discover:f="render",prefetch:u="none",relative:m,reloadDocument:h,replace:g,mask:w,state:y,target:p,to:z,preventScrollReset:E,viewTransition:D,defaultShouldRevalidate:Y,...q},k){let{basename:H,navigator:U,useTransitions:J}=x.useContext(wt),L=typeof z=="string"&&dh.test(z),F=th(z,H);z=F.to;let K=M0(z,{relative:m}),ee=Vt(),G=null;if(w){let ye=Er(w,[],ee.mask?ee.mask.pathname:"/",!0);H!=="/"&&(ye.pathname=ye.pathname==="/"?H:kt([H,ye.pathname])),G=U.createHref(ye)}let[oe,W,V]=dv(u,q),Z=wv(z,{replace:g,mask:w,state:y,target:p,preventScrollReset:E,relative:m,viewTransition:D,defaultShouldRevalidate:Y,useTransitions:J});function ae(ye){c&&c(ye),ye.defaultPrevented||Z(ye)}let ie=!(F.isExternal||h),he=x.createElement("a",{...q,...V,href:(ie?G:void 0)||F.absoluteURL||K,onClick:ie?ae:c,ref:vv(k,W),target:p,"data-discover":!L&&f==="render"?"true":void 0});return oe&&!L?x.createElement(x.Fragment,null,he,x.createElement(mv,{page:K})):he});Oe.displayName="Link";var fu=x.forwardRef(function({"aria-current":c="page",caseSensitive:f=!1,className:u="",end:m=!1,style:h,to:g,viewTransition:w,children:y,...p},z){let E=Kn(g,{relative:p.relative}),D=Vt(),Y=x.useContext(jr),{navigator:q,basename:k}=x.useContext(wt),H=Y!=null&&zv(E)&&w===!0,U=q.encodeLocation?q.encodeLocation(E).pathname:E.pathname,J=D.pathname,L=Y&&Y.navigation&&Y.navigation.location?Y.navigation.location.pathname:null;f||(J=J.toLowerCase(),L=L?L.toLowerCase():null,U=U.toLowerCase()),L&&k&&(L=ua(L,k)||L);const F=U!=="/"&&U.endsWith("/")?U.length-1:U.length;let K=J===U||!m&&J.startsWith(U)&&J.charAt(F)==="/",ee=L!=null&&(L===U||!m&&L.startsWith(U)&&L.charAt(U.length)==="/"),G={isActive:K,isPending:ee,isTransitioning:H},oe=K?c:void 0,W;typeof u=="function"?W=u(G):W=[u,K?"active":null,ee?"pending":null,H?"transitioning":null].filter(Boolean).join(" ");let V=typeof h=="function"?h(G):h;return x.createElement(Oe,{...p,"aria-current":oe,className:W,ref:z,style:V,to:g,viewTransition:w},typeof y=="function"?y(G):y)});fu.displayName="NavLink";var bv=x.forwardRef(({discover:r="render",fetcherKey:c,navigate:f,reloadDocument:u,replace:m,state:h,method:g=xr,action:w,onSubmit:y,relative:p,preventScrollReset:z,viewTransition:E,defaultShouldRevalidate:D,...Y},q)=>{let{useTransitions:k}=x.useContext(wt),H=Nv(),U=Tv(w,{relative:p}),J=g.toLowerCase()==="get"?"get":"post",L=typeof w=="string"&&dh.test(w),F=K=>{if(y&&y(K),K.defaultPrevented)return;K.preventDefault();let ee=K.nativeEvent.submitter,G=(ee==null?void 0:ee.getAttribute("formmethod"))||g,oe=()=>H(ee||K.currentTarget,{fetcherKey:c,method:G,navigate:f,replace:m,state:h,relative:p,preventScrollReset:z,viewTransition:E,defaultShouldRevalidate:D});k&&f!==!1?x.startTransition(()=>oe()):oe()};return x.createElement("form",{ref:q,method:J,action:U,onSubmit:u?y:F,...Y,"data-discover":!L&&r==="render"?"true":void 0})});bv.displayName="Form";function Sv(r){return`${r} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function mh(r){let c=x.useContext(Ql);return Be(c,Sv(r)),c}function wv(r,{target:c,replace:f,mask:u,state:m,preventScrollReset:h,relative:g,viewTransition:w,defaultShouldRevalidate:y,useTransitions:p}={}){let z=tl(),E=Vt(),D=Kn(r,{relative:g});return x.useCallback(Y=>{if(ev(Y,c)){Y.preventDefault();let q=f!==void 0?f:Qn(E)===Qn(D),k=()=>z(r,{replace:q,mask:u,state:m,preventScrollReset:h,relative:g,viewTransition:w,defaultShouldRevalidate:y});p?x.startTransition(()=>k()):k()}},[E,z,D,f,u,m,c,r,h,g,w,y,p])}var Ev=0,jv=()=>`__${String(++Ev)}__`;function Nv(){let{router:r}=mh("useSubmit"),{basename:c}=x.useContext(wt),f=V0(),u=r.fetch,m=r.navigate;return x.useCallback(async(h,g={})=>{let{action:w,method:y,encType:p,formData:z,body:E}=lv(h,c);if(g.navigate===!1){let D=g.fetcherKey||jv();await u(D,f,g.action||w,{defaultShouldRevalidate:g.defaultShouldRevalidate,preventScrollReset:g.preventScrollReset,formData:z,body:E,formMethod:g.method||y,formEncType:g.encType||p,flushSync:g.flushSync})}else await m(g.action||w,{defaultShouldRevalidate:g.defaultShouldRevalidate,preventScrollReset:g.preventScrollReset,formData:z,body:E,formMethod:g.method||y,formEncType:g.encType||p,replace:g.replace,state:g.state,fromRouteId:f,flushSync:g.flushSync,viewTransition:g.viewTransition})},[u,m,c,f])}function Tv(r,{relative:c}={}){let{basename:f}=x.useContext(wt),u=x.useContext(Xt);Be(u,"useFormAction must be used inside a RouteContext");let[m]=u.matches.slice(-1),h={...Kn(r||".",{relative:c})},g=Vt();if(r==null){h.search=g.search;let w=new URLSearchParams(h.search),y=w.getAll("index");if(y.some(z=>z==="")){w.delete("index"),y.filter(E=>E).forEach(E=>w.append("index",E));let z=w.toString();h.search=z?`?${z}`:""}}return(!r||r===".")&&m.route.index&&(h.search=h.search?h.search.replace(/^\?/,"?index&"):"?index"),f!=="/"&&(h.pathname=h.pathname==="/"?f:kt([f,h.pathname])),Qn(h)}function zv(r,{relative:c}={}){let f=x.useContext(nh);Be(f!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:u}=mh("useViewTransitionState"),m=Kn(r,{relative:c});if(!f.isTransitioning)return!1;let h=ua(f.currentLocation.pathname,u)||f.currentLocation.pathname,g=ua(f.nextLocation.pathname,u)||f.nextLocation.pathname;return Sr(m.pathname,g)!=null||Sr(m.pathname,h)!=null}const xe={name:"Smoking Burgers",tagline:"Slow-smoked. Hand-built. Unapologetically gourmet.",hq:{line1:"14 Ember Lane",line2:"Brooklyn, NY 11211",phone:"(212) 555-0140",email:"hello@smokingburgers.example"},social:[{label:"Instagram",href:"https://instagram.com",handle:"@smokingburgers"},{label:"TikTok",href:"https://tiktok.com",handle:"@smokingburgers"},{label:"Facebook",href:"https://facebook.com",handle:"Smoking Burgers"}],nav:[{label:"Home",href:"/"},{label:"Menu",href:"/menu"},{label:"Offers",href:"/offers"},{label:"Branches",href:"/branches"},{label:"Contact",href:"/contact"}]},Jn=[{id:"entra-external-id",type:"oidc",displayName:"Customer sign in",providerIdentifier:"https://<your-tenant-name>.ciamlogin.com/<your-tenant-id>"},{id:"entra-id",type:"entra-id",displayName:"Staff sign in"},{id:"local",type:"local",displayName:"Sign in with email",loginByEmail:!0}];if(Jn.length===0)throw new Error("AUTH_PROVIDERS array is empty. Configure at least one authentication provider.");const Bt=Jn.find(r=>r.type==="local"),Gl=Jn.filter(r=>r.type!=="local"),nt=typeof window<"u"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"),Xl={userName:"dev@smokingburgers.example",firstName:"Dev",lastName:"User",email:"dev@smokingburgers.example",contactId:"00000000-0000-0000-0000-000000000001",userRoles:["Authenticated Users","Administrators"]},$n="__pp_dev_signedout__";function Xm(r){const c=new URL(r,window.location.origin);return c.origin!==window.location.origin?"/":`${c.pathname}${c.search}${c.hash}`||"/"}function Kl(){var r,c,f;if(!(typeof window>"u"))return nt?sessionStorage.getItem($n)?void 0:Xl:(f=(c=(r=window.Microsoft)==null?void 0:r.Dynamic365)==null?void 0:c.Portal)==null?void 0:f.User}function hh(){const r=Kl();return!!(r!=null&&r.userName)}function Av(){var r,c,f;return nt?"00000000-0000-0000-0000-000000000000":(f=(c=(r=window.Microsoft)==null?void 0:r.Dynamic365)==null?void 0:c.Portal)==null?void 0:f.tenant}async function al(){const r=await fetch("/_layout/tokenhtml");if(!r.ok)throw new Error(`Failed to fetch anti-forgery token: ${r.status} ${r.statusText}. Ensure the site is deployed and accessible.`);const f=(await r.text()).match(/value="([^"]+)"/);if(!f)throw new Error("Failed to extract anti-forgery token from /_layout/tokenhtml");return f[1]}function Cv(r){if(r.type==="local")throw new Error(`resolveProviderIdentifier called for local provider ${r.id}`);if(r.type==="entra-id"){const c=Av();if(!c)throw new Error("Cannot resolve Entra ID provider identifier — tenant ID not available. Ensure the site is properly deployed and window.Microsoft.Dynamic365.Portal.tenant is set.");return`https://login.windows.net/${c}/`}if(!r.providerIdentifier)throw new Error(`Provider ${r.id} (type ${r.type}) is missing providerIdentifier.`);return r.providerIdentifier}async function _v(r,c,f){if(nt){sessionStorage.removeItem($n),window.location.reload();return}const u=await al(),m=document.createElement("form");m.method="POST",m.action=f?`/Account/Login/ExternalLogin?InvitationCode=${encodeURIComponent(f)}`:"/Account/Login/ExternalLogin";const h={__RequestVerificationToken:u,provider:r,returnUrl:c||"/"};for(const[g,w]of Object.entries(h)){const y=document.createElement("input");y.type="hidden",y.name=g,y.value=w,m.appendChild(y)}document.body.appendChild(m),m.submit()}async function du(r,c={}){if(r.type==="local"){if(!c.credentials)throw new Error("Local sign-in requires email and password.");return Rv(c.credentials.credential,c.credentials.password,c.credentials.rememberMe,c.returnUrl,c.invitationCode)}const f=Cv(r);return _v(f,c.returnUrl,c.invitationCode)}async function Rv(r,c,f=!1,u,m){if(nt){sessionStorage.removeItem($n),window.location.href=u||"/";return}const h=await al(),g=(Bt==null?void 0:Bt.loginByEmail)===!1?"Username":"Email",w=new URLSearchParams;w.set("__RequestVerificationToken",h),w.set(g,r),w.set("PasswordValue",c),w.set("ReturnUrl",u||"/"),f&&w.set("RememberMe","true");const y=m?`/SignIn?InvitationCode=${encodeURIComponent(m)}`:"/SignIn",p=await fetch(y,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:w.toString(),credentials:"same-origin",redirect:"follow"});if(p.url.includes("TermsAndConditions"))throw new Ua;if(p.redirected||p.url.endsWith(u||"/")){window.location.href=u||"/";return}const z=await p.text(),E=ll(z);throw E.length>0?new Error(E.join(" ")):new Error("Invalid email or password. Please try again.")}async function Ov(r,c,f){var Z,ae;if(!r.email&&!r.username)throw new Error("Registration requires either an email or username.");if(nt){sessionStorage.removeItem($n),window.location.href=c;return}const u=new URLSearchParams;u.set("returnUrl",c),f&&u.set("invitationCode",f);const m=u.toString(),h=`/Account/Login/Register${m?`?${m}`:""}`,g=await fetch(h,{credentials:"same-origin"});if(!g.ok)throw new Error(`Failed to load registration page (status ${g.status}).`);const w=await g.text(),p=new DOMParser().parseFromString(w,"text/html"),z=p.getElementById("Register");if(!z)throw new Error("Registration form not found on the server page.");const E=z.getAttribute("action")||"";let D;if(E.startsWith("http")||E.startsWith("/"))D=E;else{const ie=new URL("/Account/Login/",window.location.origin),he=new URL(E,ie);D=he.pathname+he.search}const Y=ie=>{var he;return((he=p.getElementById(ie))==null?void 0:he.value)||""},q=Y("__VIEWSTATE"),k=Y("__VIEWSTATEGENERATOR"),H=((Z=p.querySelector('input[name="__EVENTVALIDATION"]'))==null?void 0:Z.value)||"",U=((ae=p.querySelector('input[name="__RequestVerificationToken"]'))==null?void 0:ae.value)||"",J=p.getElementById("EmailTextBox"),L=p.getElementById("UsernameTextBox"),F=p.getElementById("PasswordTextBox"),K=p.getElementById("ConfirmPasswordTextBox"),ee=p.getElementById("SubmitButton"),G=new URLSearchParams;G.set("__VIEWSTATE",q),G.set("__VIEWSTATEGENERATOR",k),G.set("__EVENTTARGET",""),G.set("__EVENTARGUMENT",""),G.set("__VIEWSTATEENCRYPTED",""),H&&G.set("__EVENTVALIDATION",H),U&&G.set("__RequestVerificationToken",U),r.email&&J&&G.set(J.name,r.email),r.username&&L&&G.set(L.name,r.username),F&&G.set(F.name,r.password),K&&G.set(K.name,r.confirmPassword),ee&&G.set(ee.name,ee.value||"Register");const oe=await fetch(D,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:G.toString(),credentials:"same-origin",redirect:"follow"});if(oe.url.includes("TermsAndConditions"))throw new Ua;if(oe.redirected){window.location.href=oe.url;return}const W=await oe.text(),V=ll(W);if(V.length>0)throw new Error(V.join(" "));if(oe.url!==window.location.href){window.location.href=oe.url;return}throw new Error("Registration failed. Please try again.")}async function Mv(r){if(nt)return;const c=await al(),f=new URLSearchParams;f.set("__RequestVerificationToken",c),f.set("Email",r);const m=await(await fetch("/Account/Login/ForgotPassword",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:f.toString(),credentials:"same-origin",redirect:"follow"})).text(),h=ll(m);if(h.length>0)throw new Error(h.join(" "))}async function Dv(r,c,f,u){if(nt){window.location.href="/login?message=password_reset_success";return}const m=await al(),h=new URLSearchParams;h.set("__RequestVerificationToken",m),h.set("UserId",r),h.set("Code",c),h.set("Password",f),h.set("ConfirmPassword",u);const g=await fetch("/Account/Login/ResetPassword",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:h.toString(),credentials:"same-origin",redirect:"follow"});if(g.redirected){window.location.href="/login?message=password_reset_success";return}const w=await g.text(),y=ll(w);throw y.length>0?new Error(y.join(" ")):new Error("Failed to reset password. The link may have expired.")}async function Uv(r,c,f="/"){if(!r)throw new Error("Invitation code is required.");if(nt)return{nextStep:c?"login":"register"};const u=await al(),m=new URLSearchParams;m.set("__RequestVerificationToken",u),m.set("InvitationCode",r),m.set("RedeemByLogin",c?"true":"false"),m.set("returnUrl",f);const h=await fetch("/Account/Login/RedeemInvitation",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:m.toString(),credentials:"same-origin",redirect:"manual"});if(h.type==="opaqueredirect")return{nextStep:"register"};if(h.ok){const g=await h.text(),w=ll(g);if(w.length>0)throw new Error(w.join(" "));if(g.includes('name="PasswordValue"')||g.includes("LoginLocal"))return{nextStep:"login"};throw new Error("Unable to process invitation. Please try again.")}throw new Error(`Failed to redeem invitation (status ${h.status}).`)}async function Bv(r){if(!r)return{email:""};if(nt)return{email:"invited.user@smokingburgers.example"};const c=`/Account/Login/Register?invitationCode=${encodeURIComponent(r)}`,f=await fetch(c,{credentials:"same-origin"});if(!f.ok)return{email:""};const u=await f.text(),g=new DOMParser().parseFromString(u,"text/html").getElementById("EmailTextBox");return{email:(g==null?void 0:g.getAttribute("value"))||""}}function ph(r){if(nt){sessionStorage.setItem($n,"1"),window.location.reload();return}const c=r||"/";window.location.href=`/Account/Login/LogOff?returnUrl=${encodeURIComponent(c)}`}const kv={access_denied:"Access was denied by the identity provider.",missing_license:"Your account does not have the required license.",invalid_login:"Invalid login. Please try again.",invalid_username_or_password:"Invalid username or password.",user_locked:"Your account has been locked due to too many failed attempts. Please try again later.",too_many_attempts:"Too many failed login attempts. Please try again later.",invalid_invitation:"The invitation code is invalid or has expired.",duplicate_login:"This external identity is already linked to another account.",registration_blocked:"Registration is not available for this provider.",signin_failed:"Sign-in failed. Please try again.",external_auth_failed:"Sign-in with the external provider failed. Please try again."};function gh(){if(typeof window>"u")return;const r=new URLSearchParams(window.location.search),c=r.get("message")||r.get("error");if(c)return kv[c]||"An authentication error occurred. Please try again."}function Lv(){if(typeof window>"u")return;if(new URLSearchParams(window.location.search).get("sessionExpired")==="true")return"Your session has expired. Please sign in again."}function ll(r){const f=new DOMParser().parseFromString(r,"text/html"),u=[];return f.querySelectorAll(".validation-summary-errors li").forEach(m=>{var g;const h=(g=m.textContent)==null?void 0:g.trim();h&&u.push(h)}),f.querySelectorAll(".alert-danger li").forEach(m=>{var g;const h=(g=m.textContent)==null?void 0:g.trim();h&&!u.includes(h)&&u.push(h)}),f.querySelectorAll(".field-validation-error").forEach(m=>{var g;const h=(g=m.textContent)==null?void 0:g.trim();h&&!u.includes(h)&&u.push(h)}),u}class Ua extends Error{constructor(){super("Terms and conditions acceptance required."),this.name="TermsRequiredError"}}async function Hv(r){var L;const c=Xm(r);if(nt){window.location.href=c;return}const f=new URLSearchParams(window.location.search),u=f.get("UseExternalSignInAsync")||"False",m=f.get("IsFacebook")||"False",h=f.get("IsInternalAADUser")||"False";f.get("ReturnUrl");const w=`/Account/Login/TermsAndConditions${window.location.search}`,y=await fetch(w,{credentials:"same-origin",redirect:"follow"}),p=new URL(y.url).pathname+new URL(y.url).search,z=await y.text(),Y=((L=new DOMParser().parseFromString(z,"text/html").querySelector('input[name="__RequestVerificationToken"]'))==null?void 0:L.value)||"",q=new URLSearchParams;q.set("__RequestVerificationToken",Y),q.set("InvitationCode",""),q.set("IsFacebook",m),q.set("UseExternalSignInAsync",u),q.set("IsInternalAADUser",h),q.set("IsTermsAndConditionsAccepted","true");const k=await fetch(p,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:q.toString(),credentials:"same-origin",redirect:"follow"}),H=Xm(r);if(k.redirected||k.ok){window.location.href=H;return}const U=await k.text(),J=ll(U);throw J.length>0?new Error(J.join(" ")):new Error("Failed to accept terms. Please try again.")}class mu extends Error{constructor(){super("External login session expired. Please sign in again."),this.name="ExternalLoginCookieExpiredError"}}async function qv(){var w;if(nt)return{email:"new.customer@smokingburgers.example",firstName:"New",lastName:"Customer",username:"new.customer",invitationCode:"",returnUrl:"/",antiForgeryToken:"<development-only-anti-forgery-token>"};const r=await fetch("/Account/Login/ExternalLoginCallback",{credentials:"same-origin"});if(!r.ok)throw new Error(`Failed to fetch external login details (status ${r.status}).`);const c=await r.text(),u=new DOMParser().parseFromString(c,"text/html");if(!u.querySelector('input[name="Email"]'))throw new mu;const m=y=>{var p;return((p=u.querySelector(y))==null?void 0:p.value)||""},h=((w=u.querySelector("form"))==null?void 0:w.getAttribute("action"))||"",g=new URLSearchParams(h.split("?")[1]||"");return{email:m('input[name="Email"]'),firstName:m('input[name="FirstName"]'),lastName:m('input[name="LastName"]'),username:m('input[name="Username"]'),invitationCode:m('input[name="InvitationCode"]')||g.get("InvitationCode")||"",returnUrl:g.get("ReturnUrl")||"/",antiForgeryToken:m('input[name="__RequestVerificationToken"]')}}async function Yv(r){if(nt){window.location.href=r.returnUrl||"/";return}const c=new URLSearchParams;c.set("__RequestVerificationToken",r.antiForgeryToken),c.set("Email",r.email),c.set("FirstName",r.firstName),c.set("LastName",r.lastName),c.set("Username",r.username);const f=new URLSearchParams;r.returnUrl&&f.set("ReturnUrl",r.returnUrl),r.invitationCode&&f.set("InvitationCode",r.invitationCode);const u=f.toString(),m=`/Account/Login/ExternalLoginConfirmation${u?`?${u}`:""}`,h=await fetch(m,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:c.toString(),credentials:"same-origin",redirect:"manual"});if(h.type==="opaqueredirect"){window.location.href=r.returnUrl||"/";return}if(h.ok){const g=await h.text(),w=ll(g);throw w.length>0?new Error(w.join(" ")):g.includes("TermsAndConditions")||g.includes("IsTermsAndConditionsAccepted")?new Ua:new Error("Unable to complete external login. Please try again.")}throw new Error(`Failed to confirm external login (status ${h.status}).`)}const Gv=["firstname","lastname","emailaddress1","mobilephone","address1_line1","address1_line2","address1_city","address1_stateorprovince","address1_postalcode","address1_country"];async function Xv(){const r=Kl();if(!(r!=null&&r.contactId))throw new Error("Cannot load profile — no signed-in contact.");if(nt)return{firstname:Xl.firstName,lastname:Xl.lastName,emailaddress1:Xl.email,mobilephone:"+1 (555) 123-4567",address1_line1:"14 Ember Lane",address1_line2:"",address1_city:"Brooklyn",address1_stateorprovince:"NY",address1_postalcode:"11211",address1_country:"United States"};const c=Gv.join(","),f=await fetch(`/_api/contacts(${r.contactId})?$select=${c}`,{method:"GET",headers:{Accept:"application/json"},credentials:"same-origin"});if(!f.ok)throw new Error(`Failed to load profile (status ${f.status}). Check that Web API is enabled for the contact table and that you have permission to read your own contact.`);const u=await f.json();return{firstname:u.firstname||"",lastname:u.lastname||"",emailaddress1:u.emailaddress1||"",mobilephone:u.mobilephone||"",address1_line1:u.address1_line1||"",address1_line2:u.address1_line2||"",address1_city:u.address1_city||"",address1_stateorprovince:u.address1_stateorprovince||"",address1_postalcode:u.address1_postalcode||"",address1_country:u.address1_country||""}}async function Vv(r){var m;const c=Kl();if(!(c!=null&&c.contactId))throw new Error("Cannot update profile — no signed-in contact.");if(nt){r.firstname!==void 0&&(Xl.firstName=r.firstname),r.lastname!==void 0&&(Xl.lastName=r.lastname);return}const f=await al(),u=await fetch(`/_api/contacts(${c.contactId})`,{method:"PATCH",headers:{"Content-Type":"application/json",Accept:"application/json",__RequestVerificationToken:f},body:JSON.stringify(r),credentials:"same-origin"});if(!u.ok){let h="";try{const g=await u.json();h=((m=g==null?void 0:g.error)==null?void 0:m.message)||""}catch{try{h=await u.text()}catch{}}throw new Error(h?`Failed to update profile: ${h}`:`Failed to update profile (status ${u.status}). Check that Web API is enabled for the contact table and that you have permission to update your own contact.`)}}function Qv(){const r=Kl();if(!r)return"";const c=[r.firstName,r.lastName].filter(Boolean).join(" ");return c||(r.firstName?r.firstName:r.userName?r.userName:r.email?r.email:"User")}function Zv(){const r=Kl();return r?r.firstName&&r.lastName?`${r.firstName[0]}${r.lastName[0]}`.toUpperCase():r.firstName?r.firstName[0].toUpperCase():((r.userName||r.email||"")[0]||"").toUpperCase():""}function Tr(){const[r,c]=x.useState(void 0),[f,u]=x.useState(!0),m=x.useCallback(()=>{c(Kl()),u(!1)},[]);return x.useEffect(()=>{m()},[m]),{user:r,isAuthenticated:hh(),isLoading:f,displayName:Qv(),initials:Zv(),logout:ph,refresh:m}}function Kv(){const{isAuthenticated:r,isLoading:c,displayName:f,initials:u,logout:m}=Tr(),[h,g]=x.useState(!1),w=x.useRef(null);return x.useEffect(()=>{if(!h)return;function y(p){w.current&&!w.current.contains(p.target)&&g(!1)}return document.addEventListener("mousedown",y),()=>document.removeEventListener("mousedown",y)},[h]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Jv}),c?o.jsx("div",{className:"auth-button auth-loading","aria-label":"Loading sign-in status",children:o.jsx("span",{className:"auth-spinner","aria-hidden":"true"})}):r?o.jsxs("div",{className:"auth-button auth-signed-in",ref:w,children:[o.jsxs("button",{type:"button",className:"auth-trigger","aria-haspopup":"menu","aria-expanded":h,onClick:()=>g(y=>!y),children:[o.jsx("span",{className:"auth-avatar","aria-hidden":"true",children:u||"·"}),o.jsx("span",{className:"auth-name",children:f}),o.jsx("svg",{className:`auth-caret ${h?"is-open":""}`,width:"10",height:"10",viewBox:"0 0 10 10",fill:"none","aria-hidden":"true",children:o.jsx("path",{d:"M2 4 L5 7 L8 4",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round",strokeLinejoin:"round"})})]}),h&&o.jsxs("div",{role:"menu",className:"auth-menu",children:[o.jsx("div",{className:"auth-menu-user",children:o.jsx("span",{className:"auth-menu-name",children:f})}),o.jsx(Oe,{role:"menuitem",to:"/user-profile",className:"auth-menu-item",onClick:()=>g(!1),children:"Profile"}),o.jsx("button",{role:"menuitem",type:"button",className:"auth-menu-item",onClick:()=>m(),children:"Sign out"})]})]}):o.jsx(Oe,{to:"/login",className:"auth-button auth-sign-in",children:"Sign in"})]})}const Jv=`
.auth-button {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.auth-sign-in {
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid var(--color-border-hot);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.25s var(--ease-out), color 0.25s var(--ease-out), background 0.25s var(--ease-out);
}
.auth-sign-in:hover {
  border-color: var(--color-primary);
  color: var(--color-secondary);
  background: rgba(201, 137, 61, 0.08);
}
.auth-sign-in:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.auth-loading {
  width: 36px;
  height: 36px;
  justify-content: center;
}
.auth-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--color-text-muted);
  border-right-color: transparent;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }

.auth-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  background: transparent;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.25s var(--ease-out), background 0.25s var(--ease-out);
}
.auth-trigger:hover {
  border-color: var(--color-primary);
  background: rgba(201, 137, 61, 0.08);
}
.auth-trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.auth-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #1A1207;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-name {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-caret {
  color: var(--color-text-muted);
  transition: transform 0.2s var(--ease-out);
}
.auth-caret.is-open { transform: rotate(180deg); }

.auth-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 200px;
  padding: 8px;
  background: rgba(20, 16, 14, 0.98);
  border: 1px solid var(--color-border-hot);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.auth-menu-user {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}
.auth-menu-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-menu-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  text-align: left;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: none;
  box-sizing: border-box;
  transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
}
.auth-menu-item:hover {
  background: rgba(201, 137, 61, 0.1);
  color: var(--color-secondary);
}
.auth-menu-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

@media (max-width: 820px) {
  .auth-name { max-width: 100px; }
}
`;function $v(){const[r,c]=x.useState(!1),[f,u]=x.useState(!1);return x.useEffect(()=>{const m=()=>c(window.scrollY>24);return m(),window.addEventListener("scroll",m,{passive:!0}),()=>window.removeEventListener("scroll",m)},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Fv}),o.jsx("header",{className:`navbar ${r?"is-scrolled":""}`,children:o.jsxs("div",{className:"navbar-inner container",children:[o.jsxs(fu,{to:"/",className:"brand","aria-label":`${xe.name} — Home`,onClick:()=>u(!1),children:[o.jsx("span",{className:"brand-mark","aria-hidden":"true",children:o.jsxs("svg",{width:"28",height:"28",viewBox:"0 0 28 28",fill:"none",focusable:"false",children:[o.jsx("path",{d:"M4 16 C4 11 8 8 14 8 C20 8 24 11 24 16",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"}),o.jsx("path",{d:"M3.5 17.5 H24.5",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"}),o.jsx("path",{d:"M5 21 C8 19.5 12 19.5 14 21 C16 22.5 20 22.5 23 21",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round",fill:"none"}),o.jsx("path",{d:"M9 6 C9 4.5 10 3.5 10 2",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round"}),o.jsx("path",{d:"M14 6 C14 4.5 15 3.5 15 2",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round"}),o.jsx("path",{d:"M19 6 C19 4.5 20 3.5 20 2",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round"})]})}),o.jsxs("span",{className:"brand-text",children:[o.jsx("span",{className:"brand-line-1",children:"Smoking"}),o.jsx("span",{className:"brand-line-2",children:"Burgers"})]})]}),o.jsxs("button",{type:"button",className:`menu-toggle ${f?"is-open":""}`,"aria-expanded":f,"aria-controls":"primary-nav","aria-label":f?"Close menu":"Open menu",onClick:()=>u(m=>!m),children:[o.jsx("span",{"aria-hidden":"true"}),o.jsx("span",{"aria-hidden":"true"}),o.jsx("span",{"aria-hidden":"true"})]}),o.jsx("nav",{id:"primary-nav",className:`primary-nav ${f?"is-open":""}`,"aria-label":"Primary",children:o.jsxs("ul",{children:[xe.nav.map(m=>o.jsx("li",{children:o.jsx(fu,{to:m.href,end:m.href==="/",className:({isActive:h})=>`nav-link ${h?"is-active":""}`,onClick:()=>u(!1),children:m.label})},m.href)),o.jsx("li",{className:"nav-auth",children:o.jsx(Kv,{})})]})})]})})]})}const Fv=`
.navbar {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(14, 11, 10, 0.72) 0%, rgba(14, 11, 10, 0.0) 100%);
  backdrop-filter: blur(0px);
  transition: background 0.4s var(--ease-out), backdrop-filter 0.4s var(--ease-out), border-color 0.4s var(--ease-out);
  border-bottom: 1px solid transparent;
}
.navbar.is-scrolled {
  background: rgba(14, 11, 10, 0.85);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--color-border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 18px;
  padding-bottom: 18px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--color-secondary);
  text-decoration: none;
}
.brand:hover { color: var(--color-primary); }
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px; height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(201, 137, 61, 0.18), rgba(168, 52, 28, 0.12));
  border: 1px solid var(--color-border-hot);
  color: var(--color-secondary);
}
.brand-text {
  display: flex; flex-direction: column;
  font-family: var(--font-display);
  line-height: 1;
}
.brand-line-1 {
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--color-text-muted);
  font-family: var(--font-body);
}
.brand-line-2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin-top: 4px;
  color: var(--color-text);
}

.primary-nav ul {
  display: flex; align-items: center; gap: 36px;
  list-style: none; padding: 0; margin: 0;
}
.nav-auth {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
}
.nav-link {
  position: relative;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 6px 0;
  transition: color 0.25s var(--ease-out);
}
.nav-link::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -2px;
  height: 1px;
  background: var(--color-primary);
  transform: scaleX(0); transform-origin: left;
  transition: transform 0.4s var(--ease-cinematic);
}
.nav-link:hover { color: var(--color-text); }
.nav-link:hover::after { transform: scaleX(1); }
.nav-link.is-active { color: var(--color-secondary); }
.nav-link.is-active::after { transform: scaleX(1); }

.menu-toggle {
  display: none;
  background: transparent;
  border: 1px solid var(--color-border-hot);
  border-radius: 10px;
  width: 44px; height: 44px;
  padding: 0;
  align-items: center; justify-content: center;
  flex-direction: column; gap: 5px;
}
.menu-toggle span {
  display: block;
  width: 20px; height: 1.5px;
  background: var(--color-text);
  transition: transform 0.3s var(--ease-cinematic), opacity 0.2s ease;
}
.menu-toggle.is-open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.menu-toggle.is-open span:nth-child(2) { opacity: 0; }
.menu-toggle.is-open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

@media (max-width: 820px) {
  .menu-toggle { display: inline-flex; }
  .primary-nav {
    position: fixed;
    inset: 76px 0 auto 0;
    background: rgba(14, 11, 10, 0.96);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    transform: translateY(-12px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s var(--ease-out), transform 0.3s var(--ease-cinematic);
  }
  .primary-nav.is-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .primary-nav ul {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 16px 24px 24px;
  }
  .primary-nav .nav-link {
    display: block;
    padding: 16px 4px;
    border-bottom: 1px solid var(--color-border);
    font-size: 16px;
  }
  .primary-nav li:last-child .nav-link { border-bottom: none; }
  .nav-auth {
    margin-left: 0;
    padding: 16px 4px;
    border-top: 1px solid var(--color-border);
  }
}
`;function Wv(){return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Iv}),o.jsx("footer",{className:"footer",children:o.jsxs("div",{className:"footer-inner container",children:[o.jsxs("div",{className:"footer-grid",children:[o.jsxs("div",{className:"footer-brand",children:[o.jsx("span",{className:"eyebrow",children:"Smokehouse · Est. 2014"}),o.jsxs("h3",{className:"footer-heading",children:["Patiently smoked.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"Always worth the wait."})]}),o.jsx("p",{className:"footer-blurb",children:"Five locations across the city. One philosophy: take your time, build it by hand, never cut a corner."})]}),o.jsxs("div",{className:"footer-col",children:[o.jsx("h4",{className:"footer-col-title",children:"Explore"}),o.jsx("ul",{children:xe.nav.map(r=>o.jsx("li",{children:o.jsx(Oe,{to:r.href,children:r.label})},r.href))})]}),o.jsxs("div",{className:"footer-col",children:[o.jsx("h4",{className:"footer-col-title",children:"Visit"}),o.jsxs("address",{className:"footer-address",children:[xe.hq.line1,o.jsx("br",{}),xe.hq.line2,o.jsx("br",{}),o.jsx("a",{href:`tel:${xe.hq.phone.replace(/\D/g,"")}`,children:xe.hq.phone}),o.jsx("br",{}),o.jsx("a",{href:`mailto:${xe.hq.email}`,children:xe.hq.email})]})]}),o.jsxs("div",{className:"footer-col",children:[o.jsx("h4",{className:"footer-col-title",children:"Follow"}),o.jsx("ul",{children:xe.social.map(r=>o.jsx("li",{children:o.jsxs("a",{href:r.href,target:"_blank",rel:"noopener noreferrer","aria-label":`${xe.name} on ${r.label}`,children:[r.label," ",o.jsx("span",{className:"footer-social-handle",children:r.handle})]})},r.label))})]})]}),o.jsxs("div",{className:"footer-bar",children:[o.jsxs("span",{children:["© ",new Date().getFullYear()," ",xe.name,". Made with smoke and patience."]}),o.jsx("span",{className:"footer-bar-meta",children:"Brooklyn · New York · Chicago · Austin · Los Angeles"})]})]})})]})}const Iv=`
.footer {
  position: relative;
  background:
    radial-gradient(ellipse 900px 400px at 20% 100%, rgba(201, 137, 61, 0.08), transparent 60%),
    linear-gradient(180deg, transparent, var(--color-bg-2) 30%);
  padding: 96px 0 0;
  border-top: 1px solid var(--color-border);
  margin-top: 80px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 64px;
}

.footer-brand .eyebrow { display: inline-block; margin-bottom: 18px; }
.footer-heading {
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0 0 20px;
}
.footer-blurb {
  color: var(--color-text-muted);
  max-width: 36ch;
  font-size: 16px;
  line-height: 1.6;
}

.footer-col-title {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin: 0 0 18px;
}
.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col a {
  color: var(--color-text-muted);
  font-size: 15px;
  transition: color 0.2s ease, transform 0.2s ease;
  display: inline-block;
}
.footer-col a:hover {
  color: var(--color-secondary);
  transform: translateX(3px);
}
.footer-social-handle {
  display: block;
  font-size: 12px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.footer-address {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.8;
}
.footer-address a { color: var(--color-text-muted); }
.footer-address a:hover { color: var(--color-secondary); }

.footer-bar {
  border-top: 1px solid var(--color-border);
  padding: 24px 0 32px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
}
.footer-bar-meta { font-style: italic; font-family: var(--font-display); }

@media (max-width: 920px) {
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
  .footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 540px) {
  .footer-grid { grid-template-columns: 1fr; gap: 36px; padding-bottom: 48px; }
  .footer { padding-top: 72px; margin-top: 56px; }
  .footer-bar { flex-direction: column; }
}
`,Vm=1440*60*1e3;function Pv({intervalMs:r=Math.min(Vm/3,900*1e3),idleTimeoutMs:c=Math.min(Vm*.9,1800*1e3),onSessionExpired:f}={}){const u=x.useRef(Date.now());x.useEffect(()=>{if(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")return;function h(){u.current=Date.now()}window.addEventListener("mousemove",h,{passive:!0}),window.addEventListener("keydown",h,{passive:!0}),window.addEventListener("touchstart",h,{passive:!0}),window.addEventListener("scroll",h,{passive:!0});const g=setInterval(async()=>{if(hh()&&document.visibilityState!=="hidden"&&!(Date.now()-u.current>c))try{await al()}catch{f&&f()}},r);return()=>{clearInterval(g),window.removeEventListener("mousemove",h),window.removeEventListener("keydown",h),window.removeEventListener("touchstart",h),window.removeEventListener("scroll",h)}},[r,c,f])}function ex({children:r}){const c=tl(),f=x.useCallback(()=>{c("/login?sessionExpired=true")},[c]);return Pv({onSessionExpired:f}),o.jsxs(o.Fragment,{children:[o.jsx("a",{href:"#main",className:"skip-link",children:"Skip to content"}),o.jsx("style",{children:tx}),o.jsx($v,{}),o.jsx("main",{id:"main",className:"site-main",children:r}),o.jsx(Wv,{})]})}const tx=`
.skip-link {
  position: absolute;
  left: 16px;
  top: -100px;
  z-index: 200;
  background: var(--color-primary);
  color: #1A1207;
  padding: 12px 18px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.06em;
  transition: top 0.2s ease;
}
.skip-link:focus {
  top: 16px;
  outline: 2px solid var(--color-secondary);
  outline-offset: 3px;
}
.site-main { min-height: 60vh; }
`,vh=[{id:"ember-king",name:"The Ember King",category:"Signature Burgers",description:"Twelve-hour hickory-smoked brisket patty, aged cheddar, candied bacon, pickled red onion, bourbon ember sauce on a charcoal brioche.",price:"$22",image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=900&fit=crop",tag:"House favourite"},{id:"smoked-shorthorn",name:"Smoked Shorthorn",category:"Signature Burgers",description:"Dry-aged shorthorn beef, slow-smoked over apple wood, gruyère, caramelized shallot, black-garlic mayo, sesame brioche.",price:"$19",image:"https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=900&h=900&fit=crop"},{id:"copper-bull",name:"Copper Bull",category:"Signature Burgers",description:"Two thin smashed patties, double American cheese, smoked tomato relish, crisp shallot, copper sauce on a milk bun.",price:"$17",image:"https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&h=900&fit=crop"},{id:"ember-mushroom",name:"Ember Mushroom",category:"Signature Burgers",description:"Hand-pressed king-oyster mushroom patty, smoked provolone, charred leek, miso aioli, toasted potato bun. Plant-based.",price:"$18",image:"https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=900&h=900&fit=crop",tag:"Plant-based"},{id:"the-stoker",name:"The Stoker",category:"Signature Burgers",description:"Wagyu blend, charred jalapeño, smoked gouda, crispy onion ring, ember mayo, demi-glaze on a pretzel bun. Heat scale 3/5.",price:"$24",image:"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=900&fit=crop"},{id:"cured-smokestack",name:"Cured Smokestack",category:"Signature Burgers",description:"Triple-stack smashburger, house-cured pastrami, swiss, brown mustard slaw, dill pickle, rye-dusted brioche.",price:"$23",image:"https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&h=900&fit=crop",tag:"Limited run"},{id:"duck-fat-fries",name:"Duck-Fat Fries",category:"Sides",description:"Triple-cooked, finished in rendered duck fat, smoked sea salt, rosemary, charred-onion aioli for dipping.",price:"$8",image:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&h=900&fit=crop"},{id:"smoked-mac",name:"Smoked Mac & Cheese",category:"Sides",description:"Cavatappi in three-cheese smoked béchamel, brown-butter breadcrumb, chive, served bubbling in cast-iron.",price:"$11",image:"https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=900&h=900&fit=crop"},{id:"ember-onion-rings",name:"Ember Onion Rings",category:"Sides",description:"Buttermilk-brined Vidalia, beer batter, smoked paprika, served with a smoked honey-mustard dip.",price:"$9",image:"https://images.unsplash.com/photo-1639024471283-03518883512d?w=900&h=900&fit=crop"},{id:"charred-broccolini",name:"Charred Broccolini",category:"Sides",description:"Open-flame broccolini, lemon zest, chilli crisp, toasted almond, parmesan. A bright, blistered counterpoint.",price:"$10",image:"https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&h=900&fit=crop"},{id:"smoked-old-fashioned",name:"Smoked Old-Fashioned",category:"Drinks",description:"Bourbon, demerara, orange bitters, finished tableside under a hickory smoke cloche.",price:"$15",image:"https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&h=900&fit=crop",tag:"Signature pour"},{id:"ember-lemonade",name:"Ember Lemonade",category:"Drinks",description:"House lemonade, smoked rosemary syrup, charred orange. Non-alcoholic. Refreshing and just a little brooding.",price:"$7",image:"https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&h=900&fit=crop"},{id:"maple-cold-brew",name:"Maple Cold Brew",category:"Drinks",description:"24-hour cold brew, maple-smoked cream, sea salt, served over a single hand-cut clear ice block.",price:"$6",image:"https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=900&h=900&fit=crop"},{id:"house-craft-beer",name:"House Craft Lager",category:"Drinks",description:"Local-brewed amber lager made for us. Toasted malt, gentle bitterness, made to chase a Stoker.",price:"$8",image:"https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=900&h=900&fit=crop"},{id:"smoked-chocolate-tart",name:"Smoked Chocolate Tart",category:"Desserts",description:"Dark-chocolate ganache infused with apple-wood smoke, sea salt, candied pecan, crème fraîche quenelle.",price:"$12",image:"https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&h=900&fit=crop"},{id:"bourbon-pecan-pie",name:"Bourbon Pecan Pie",category:"Desserts",description:"Toasted pecans, brown-butter custard, splash of bourbon, served warm with vanilla bean ice cream.",price:"$11",image:"https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=900&h=900&fit=crop"},{id:"salted-caramel-shake",name:"Salted Caramel Shake",category:"Desserts",description:"Hand-spun vanilla custard, smoked caramel ribbon, flaky sea salt, served in a frosted copper cup.",price:"$9",image:"https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=900&fit=crop"}],Qm=["Signature Burgers","Sides","Drinks","Desserts"],br=[{id:"brooklyn-flagship",city:"Brooklyn",neighborhood:"Williamsburg (Flagship)",address:"14 Ember Lane, Brooklyn, NY 11211",hours:"Mon – Thu · 11:30am – 11pm",weekendHours:"Fri – Sun · 11:30am – 1am",phone:"(212) 555-0140",directionsUrl:"https://maps.google.com/?q=14+Ember+Lane+Brooklyn+NY",image:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=900&fit=crop",note:"Where it all started. The original walk-up smokers still serve the brisket on weekends."},{id:"manhattan-loft",city:"New York",neighborhood:"Lower East Side",address:"278 Orchard St, New York, NY 10002",hours:"Mon – Thu · 12pm – 12am",weekendHours:"Fri – Sun · 12pm – 2am",phone:"(212) 555-0152",directionsUrl:"https://maps.google.com/?q=278+Orchard+St+New+York+NY",image:"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&h=900&fit=crop",note:"Open late. Cocktail-first room with a tighter menu and the only true tasting bar."},{id:"chicago-westloop",city:"Chicago",neighborhood:"West Loop",address:"925 W Fulton Market, Chicago, IL 60607",hours:"Mon – Thu · 11am – 10pm",weekendHours:"Fri – Sun · 11am – midnight",phone:"(312) 555-0177",directionsUrl:"https://maps.google.com/?q=925+W+Fulton+Market+Chicago+IL",image:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=900&fit=crop",note:"A converted meatpacking warehouse. Open kitchen, twin smokers, private dining for up to 40."},{id:"austin-eastside",city:"Austin",neighborhood:"East 6th",address:"1820 E 6th St, Austin, TX 78702",hours:"Mon – Thu · 11:30am – 10pm",weekendHours:"Fri – Sun · 11:30am – midnight",phone:"(512) 555-0166",directionsUrl:"https://maps.google.com/?q=1820+E+6th+St+Austin+TX",image:"https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1400&h=900&fit=crop",note:"Patio-forward, live fire-pit on Friday and Saturday evenings, deepest bourbon list in the chain."},{id:"la-arts-district",city:"Los Angeles",neighborhood:"Arts District",address:"631 E 3rd St, Los Angeles, CA 90013",hours:"Mon – Thu · 12pm – 11pm",weekendHours:"Fri – Sun · 12pm – 1am",phone:"(213) 555-0189",directionsUrl:"https://maps.google.com/?q=631+E+3rd+St+Los+Angeles+CA",image:"https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1400&h=900&fit=crop",note:"Our newest. Loft ceilings, a vegetable-forward menu twist, and a quiet rooftop in season."}];function xh({item:r}){return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:ax}),o.jsxs("article",{className:"menu-card",children:[o.jsxs("div",{className:"menu-card-media",children:[o.jsx("img",{src:r.image,alt:`${r.name} — ${r.category}`,loading:"lazy"}),r.tag&&o.jsx("span",{className:"menu-card-tag",children:r.tag})]}),o.jsxs("div",{className:"menu-card-body",children:[o.jsxs("header",{className:"menu-card-head",children:[o.jsx("h3",{className:"menu-card-name",children:r.name}),o.jsx("span",{className:"menu-card-price",children:r.price})]}),o.jsx("p",{className:"menu-card-desc",children:r.description})]})]})]})}const ax=`
.menu-card {
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-2) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.45s var(--ease-cinematic),
              box-shadow 0.45s var(--ease-cinematic),
              border-color 0.45s var(--ease-out);
}
.menu-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}
.menu-card-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-2);
}
.menu-card-media img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.9s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.95) contrast(1.05);
}
.menu-card:hover .menu-card-media img { transform: scale(1.06); filter: saturate(1.05) contrast(1.08); }
.menu-card-tag {
  position: absolute;
  top: 14px; left: 14px;
  background: rgba(14, 11, 10, 0.78);
  backdrop-filter: blur(6px);
  border: 1px solid var(--color-border-hot);
  color: var(--color-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
}

.menu-card-body { padding: 24px 22px 26px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.menu-card-head { display: flex; align-items: baseline; gap: 16px; justify-content: space-between; }
.menu-card-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.005em;
  line-height: 1.15;
  margin: 0;
}
.menu-card-price {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-primary);
  font-size: 22px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.menu-card-desc {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.55;
}
`,lx=vh.filter(r=>["ember-king","smoked-shorthorn","the-stoker"].includes(r.id));function nx(){return x.useEffect(()=>{document.title=`${xe.name} — ${xe.tagline}`},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:ix}),o.jsxs("section",{className:"hero","aria-label":"Smoking Burgers — slow-smoked, hand-built, unapologetically gourmet",children:[o.jsx("div",{className:"hero-image","aria-hidden":"true",children:o.jsx("img",{src:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=2000&h=1400&fit=crop",alt:""})}),o.jsx("div",{className:"hero-veil","aria-hidden":"true"}),o.jsx("div",{className:"hero-ember","aria-hidden":"true"}),o.jsxs("div",{className:"container hero-content",children:[o.jsx("span",{className:"eyebrow rise d-1",children:"Smokehouse · Brooklyn · Est. 2014"}),o.jsxs("h1",{className:"hero-headline rise d-2",children:["Slow-smoked.",o.jsx("br",{}),"Hand-built.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"Unapologetically gourmet."})]}),o.jsx("p",{className:"lede rise d-3",children:"Five locations. One kitchen philosophy: take your time, build it by hand, never cut a corner. Burgers worth the wait — and the trip."}),o.jsxs("div",{className:"hero-cta rise d-4",children:[o.jsx(Oe,{to:"/menu",className:"btn btn-primary",children:"See the menu"}),o.jsx(Oe,{to:"/branches",className:"btn btn-ghost",children:"Find a branch"})]}),o.jsxs("div",{className:"hero-stats rise d-5",role:"list",children:[o.jsxs("div",{role:"listitem",className:"hero-stat",children:[o.jsxs("span",{className:"hero-stat-figure",children:["12",o.jsx("span",{className:"hero-stat-unit",children:"hr"})]}),o.jsx("span",{className:"hero-stat-label",children:"Hickory smoke on every brisket"})]}),o.jsxs("div",{role:"listitem",className:"hero-stat",children:[o.jsx("span",{className:"hero-stat-figure",children:"5"}),o.jsx("span",{className:"hero-stat-label",children:"Locations across the country"})]}),o.jsxs("div",{role:"listitem",className:"hero-stat",children:[o.jsxs("span",{className:"hero-stat-figure",children:["10",o.jsx("span",{className:"hero-stat-unit",children:"yr"})]}),o.jsx("span",{className:"hero-stat-label",children:"Building it the slow way"})]})]})]})]}),o.jsx("section",{className:"philosophy",children:o.jsxs("div",{className:"container philosophy-grid",children:[o.jsxs("div",{children:[o.jsx("span",{className:"eyebrow",children:"Our philosophy"}),o.jsxs("h2",{className:"philosophy-headline",children:["We are ",o.jsx("span",{className:"display-italic",children:"unreasonable"}),o.jsx("br",{}),"about a few things."]}),o.jsx("span",{className:"divider-rule","aria-hidden":"true"})]}),o.jsxs("div",{className:"philosophy-points",children:[o.jsxs("article",{className:"philosophy-point",children:[o.jsx("span",{className:"philosophy-num",children:"01"}),o.jsx("h3",{children:"Patience over speed"}),o.jsx("p",{children:"Briskets smoke for twelve hours. Onions caramelise for an hour. Pickles brine for a week. There is no fast burger."})]}),o.jsxs("article",{className:"philosophy-point",children:[o.jsx("span",{className:"philosophy-num",children:"02"}),o.jsx("h3",{children:"Real fire"}),o.jsx("p",{children:"Hardwood embers, not gas. Apple, hickory and oak. Every kitchen is built around the smokers — never the other way around."})]}),o.jsxs("article",{className:"philosophy-point",children:[o.jsx("span",{className:"philosophy-num",children:"03"}),o.jsx("h3",{children:"Built by hand"}),o.jsx("p",{children:"Brioche from a Brooklyn bakery, sauces from our pastry team, meat ground every morning. We never compromise the parts you don’t see."})]}),o.jsxs("article",{className:"philosophy-point",children:[o.jsx("span",{className:"philosophy-num",children:"04"}),o.jsx("h3",{children:"Small menu, deep menu"}),o.jsx("p",{children:"Six signatures, never seven. We commit to making each one impossible to ignore — then we leave it alone."})]})]})]})}),o.jsx("section",{className:"featured",children:o.jsxs("div",{className:"container",children:[o.jsxs("header",{className:"section-head",children:[o.jsx("span",{className:"eyebrow",children:"A taste of the menu"}),o.jsx("h2",{children:"Three to start, then go anywhere."}),o.jsx("p",{className:"lede",children:"A burnt-copper crowd-pleaser, a quiet dry-aged classic, and the one that comes with a heat warning. The full menu has six signatures — plus sides, smoke and dessert."})]}),o.jsx("div",{className:"featured-grid",children:lx.map(r=>o.jsx(xh,{item:r},r.id))}),o.jsx("div",{className:"featured-cta",children:o.jsx(Oe,{to:"/menu",className:"btn btn-primary",children:"See the whole menu"})})]})}),o.jsxs("section",{className:"branches-teaser",children:[o.jsx("div",{className:"branches-teaser-bg","aria-hidden":"true",children:o.jsx("img",{src:"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=2000&h=1200&fit=crop",alt:""})}),o.jsx("div",{className:"branches-teaser-veil","aria-hidden":"true"}),o.jsxs("div",{className:"container branches-teaser-inner",children:[o.jsx("span",{className:"eyebrow",children:"Find your fire"}),o.jsxs("h2",{className:"branches-teaser-headline",children:["Five rooms.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"One philosophy."})]}),o.jsx("p",{className:"lede",children:"Brooklyn, Lower East Side, Chicago West Loop, East Austin, LA Arts District. Each room is built around its own smokers — find the one closest to you."}),o.jsx("ul",{className:"branches-teaser-list","aria-label":"Our locations",children:br.map(r=>o.jsxs("li",{children:[o.jsx("span",{className:"branches-teaser-city",children:r.city}),o.jsx("span",{className:"branches-teaser-neighborhood",children:r.neighborhood})]},r.id))}),o.jsx(Oe,{to:"/branches",className:"btn btn-ghost",children:"See all branches"})]})]})]})}const ix=`
/* ---------- Hero ---------- */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: flex-end;
  padding: 180px 0 96px;
  overflow: hidden;
  isolation: isolate;
}
.hero-image {
  position: absolute; inset: 0;
  z-index: -3;
}
.hero-image img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(0.85) contrast(1.08) brightness(0.55);
  animation: heroDrift 22s var(--ease-out) infinite alternate;
}
@keyframes heroDrift {
  0% { transform: scale(1.04) translate(0, 0); }
  100% { transform: scale(1.12) translate(-1.5%, -1%); }
}
.hero-veil {
  position: absolute; inset: 0; z-index: -2;
  background:
    linear-gradient(180deg, rgba(14, 11, 10, 0.65) 0%, rgba(14, 11, 10, 0.35) 35%, rgba(14, 11, 10, 0.92) 100%),
    linear-gradient(90deg, rgba(14, 11, 10, 0.55) 0%, transparent 60%);
}
.hero-ember {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    radial-gradient(ellipse 800px 600px at 15% 75%, rgba(201, 137, 61, 0.18), transparent 60%),
    radial-gradient(ellipse 700px 500px at 85% 25%, rgba(168, 52, 28, 0.10), transparent 60%);
  animation: emberPulse 8s var(--ease-out) infinite alternate;
}
@keyframes emberPulse {
  0%   { opacity: 0.7; }
  100% { opacity: 1; }
}
.hero-content {
  position: relative;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.hero-headline {
  font-family: var(--font-display);
  font-size: clamp(56px, 9vw, 124px);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.025em;
  margin: 0;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);
}
.hero-cta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-top: 40px;
  margin-top: 32px;
  border-top: 1px solid var(--color-border-hot);
  max-width: 720px;
}
.hero-stat { display: flex; flex-direction: column; gap: 6px; }
.hero-stat-figure {
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 48px);
  font-weight: 700;
  color: var(--color-secondary);
  letter-spacing: -0.02em;
  line-height: 1;
}
.hero-stat-unit {
  font-size: 0.5em;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: 4px;
  font-style: italic;
}
.hero-stat-label {
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  line-height: 1.4;
}

/* ---------- Philosophy ---------- */
.philosophy { background: linear-gradient(180deg, var(--color-bg-2) 0%, var(--color-bg) 100%); }
.philosophy-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 80px;
  align-items: start;
}
.philosophy-headline {
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 600;
  line-height: 1.04;
  margin: 18px 0 28px;
  letter-spacing: -0.015em;
}
.philosophy-points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px 48px;
}
.philosophy-point {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
}
.philosophy-num {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--color-primary);
  font-size: 18px;
  letter-spacing: 0.1em;
  font-weight: 400;
}
.philosophy-point h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.005em;
  margin: 0;
}
.philosophy-point p {
  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 1.65;
  margin: 0;
}

/* ---------- Featured ---------- */
.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.featured-cta {
  margin-top: 56px;
  display: flex;
  justify-content: center;
}

/* ---------- Branches teaser ---------- */
.branches-teaser {
  position: relative;
  padding: 128px 0;
  overflow: hidden;
  isolation: isolate;
  border-top: 1px solid var(--color-border);
}
.branches-teaser-bg {
  position: absolute; inset: 0; z-index: -2;
}
.branches-teaser-bg img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(0.7) contrast(1.05) brightness(0.45);
}
.branches-teaser-veil {
  position: absolute; inset: 0; z-index: -1;
  background:
    linear-gradient(180deg, rgba(14, 11, 10, 0.88) 0%, rgba(14, 11, 10, 0.7) 50%, rgba(14, 11, 10, 0.95) 100%),
    radial-gradient(ellipse 900px 500px at 70% 30%, rgba(201, 137, 61, 0.14), transparent 60%);
}
.branches-teaser-inner {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.branches-teaser-headline {
  font-family: var(--font-display);
  font-size: clamp(40px, 5.5vw, 72px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 8px 0 4px;
}
.branches-teaser-list {
  list-style: none;
  margin: 12px 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 36px;
}
.branches-teaser-list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: rgba(14, 11, 10, 0.5);
  backdrop-filter: blur(8px);
}
.branches-teaser-city {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.branches-teaser-neighborhood {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--color-text);
  font-weight: 500;
}

@media (max-width: 980px) {
  .philosophy-grid { grid-template-columns: 1fr; gap: 48px; }
  .featured-grid { grid-template-columns: 1fr 1fr; }
  .branches-teaser-list { grid-template-columns: 1fr; gap: 12px; }
}
@media (max-width: 640px) {
  .hero { padding: 140px 0 80px; min-height: 92vh; }
  .hero-stats { grid-template-columns: 1fr; gap: 18px; padding-top: 28px; margin-top: 20px; }
  .philosophy-points { grid-template-columns: 1fr; gap: 36px; }
  .featured-grid { grid-template-columns: 1fr; }
}
`;function rx(){return x.useEffect(()=>{document.title=`Menu — ${xe.name}`},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:ox}),o.jsx("section",{className:"menu-hero",children:o.jsxs("div",{className:"container menu-hero-inner",children:[o.jsx("span",{className:"eyebrow rise d-1",children:"The full menu"}),o.jsxs("h1",{className:"rise d-2",children:["Six signatures.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"Plus the things you order with them."})]}),o.jsx("p",{className:"lede rise d-3",children:"All burgers are served with house pickles and a side of charred-onion aioli. The kitchen is happy to swap proteins, adjust heat, or build a plant-based version of any burger on request."}),o.jsx("nav",{className:"menu-jump rise d-4","aria-label":"Menu sections",children:Qm.map(r=>o.jsx("a",{href:`#${pr(r)}`,className:"menu-jump-link",children:r},r))})]})}),Qm.map(r=>{const c=vh.filter(f=>f.category===r);return o.jsx("section",{id:pr(r),className:"menu-section","aria-labelledby":`heading-${pr(r)}`,children:o.jsxs("div",{className:"container",children:[o.jsxs("header",{className:"section-head menu-section-head",children:[o.jsx("span",{className:"eyebrow",children:r}),o.jsxs("h2",{id:`heading-${pr(r)}`,children:[r==="Signature Burgers"&&o.jsx(o.Fragment,{children:"The signatures."}),r==="Sides"&&o.jsx(o.Fragment,{children:"The supporting cast."}),r==="Drinks"&&o.jsx(o.Fragment,{children:"Something to drink it with."}),r==="Desserts"&&o.jsx(o.Fragment,{children:"Why not finish slowly, too."})]}),o.jsx("span",{className:"divider-rule","aria-hidden":"true"})]}),o.jsx("div",{className:`menu-grid ${r==="Signature Burgers"?"menu-grid-3":"menu-grid-2"}`,children:c.map(f=>o.jsx(xh,{item:f},f.id))})]})},r)})]})}function pr(r){return r.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}const ox=`
.menu-hero {
  padding: 180px 0 64px;
  position: relative;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 80% 100%, rgba(201, 137, 61, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 0% 20%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.menu-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.menu-jump {
  margin-top: 24px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.menu-jump-link {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: 10px 16px;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  text-decoration: none;
  transition: color 0.25s var(--ease-out), background 0.25s var(--ease-out), transform 0.25s var(--ease-cinematic);
}
.menu-jump-link:hover {
  color: var(--color-secondary);
  background: var(--color-surface-2);
  transform: translateY(-1px);
}

.menu-section { padding: 80px 0; border-bottom: 1px solid var(--color-border); }
.menu-section:last-of-type { border-bottom: none; }
.menu-section:nth-of-type(even) { background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-2) 100%); }

.menu-section-head { max-width: none; flex-direction: column; gap: 12px; }

.menu-grid { display: grid; gap: 28px; }
.menu-grid-3 { grid-template-columns: repeat(3, 1fr); }
.menu-grid-2 { grid-template-columns: repeat(2, 1fr); }

@media (max-width: 980px) {
  .menu-grid-3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 620px) {
  .menu-hero { padding: 140px 0 48px; }
  .menu-grid-3, .menu-grid-2 { grid-template-columns: 1fr; }
}
`,sx=[{id:"firepit-thursdays",title:"Firepit Thursdays",subtitle:"Two burgers, one bottle, half off the second.",description:"Bring a partner, a friend, or a stranger. Order any two signature burgers between 5pm and 9pm on Thursdays and the second one is half price. Pair with a bottle of house lager for $12 more.",badge:"Weekly",validity:"Every Thursday · 5pm – 9pm",image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&h=900&fit=crop"},{id:"lunchbox-set",title:"The Smokehouse Lunchbox",subtitle:"A burger, a side, and a drink for $19.",description:"Pick any non-wagyu signature, choose duck-fat fries or charred broccolini, and add ember lemonade or maple cold brew. Lunchbox specials available weekdays.",badge:"Weekday lunch",validity:"Mon – Fri · 11:30am – 2:30pm",image:"https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1400&h=900&fit=crop"},{id:"weekend-feast",title:"Weekend Feast for Four",subtitle:"Four burgers, two big sides, dessert flight — $89.",description:"Built for the table. Four signatures of your choice (one wagyu upgrade included), one large mac, one large fries, plus a trio of chef-selected smoked desserts. Pre-order encouraged.",badge:"Group",validity:"Sat – Sun · All day",image:"https://images.unsplash.com/photo-1550547660-d9450f859349?w=1400&h=900&fit=crop"},{id:"late-shift",title:"Late Shift, Late Night",subtitle:"15% off after 10pm with a service-industry badge.",description:"For the cooks, the servers, the bartenders, the hospitality crews. Show us your latest pay stub or industry card after 10pm and get 15% off your entire bill, every night we are open.",badge:"Hospitality",validity:"Daily · 10pm – close",image:"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&h=900&fit=crop"},{id:"birthday-month",title:"Birthday Month",subtitle:"A free signature burger any visit during your birthday month.",description:"Sign up to the Ember List and any visit during your birthday month earns you one complimentary signature burger (excluding wagyu) — no minimum order, no asterisks.",badge:"Members",validity:"Your birthday month · One visit",image:"https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1400&h=900&fit=crop"},{id:"smoke-school",title:"Smoke School Sundays",subtitle:"$45 — three-course tasting + how we smoke it.",description:"Sundays at 3pm our pitmaster opens the kitchen door. Three plates, a glass of smoked old-fashioned, a tour of the smokers, and the recipes to take home. Reserves needed. Limited to twelve guests.",badge:"Experience",validity:"Sundays · 3pm – 5pm · Reservation only",image:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=900&fit=crop"}];function ux({offer:r}){return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:cx}),o.jsxs("article",{className:"offer-card",children:[o.jsxs("div",{className:"offer-media",children:[o.jsx("img",{src:r.image,alt:`${r.title} — ${r.subtitle}`,loading:"lazy"}),o.jsx("span",{className:"offer-badge",children:r.badge})]}),o.jsxs("div",{className:"offer-body",children:[o.jsx("h3",{className:"offer-title",children:r.title}),o.jsx("p",{className:"offer-subtitle",children:o.jsx("span",{className:"display-italic",children:r.subtitle})}),o.jsx("p",{className:"offer-desc",children:r.description}),o.jsxs("p",{className:"offer-validity",children:[o.jsx("span",{"aria-hidden":"true",className:"offer-validity-dot"}),r.validity]})]})]})]})}const cx=`
.offer-card {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.5s var(--ease-cinematic), box-shadow 0.5s var(--ease-cinematic), border-color 0.4s var(--ease-out);
}
.offer-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.offer-media {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  background: var(--color-bg-2);
}
.offer-media img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 1s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.92) contrast(1.08) brightness(0.92);
}
.offer-card:hover .offer-media img { transform: scale(1.06); filter: saturate(1.05) contrast(1.1) brightness(0.96); }
.offer-media::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(14, 11, 10, 0.45) 0%, transparent 35%, rgba(14, 11, 10, 0.55) 100%);
  pointer-events: none;
}
.offer-badge {
  position: absolute;
  top: 18px; left: 18px;
  background: linear-gradient(135deg, var(--color-primary), #B27530);
  color: #1A1207;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 8px 14px;
  border-radius: 999px;
  z-index: 2;
  box-shadow: 0 6px 20px -6px var(--color-primary-glow);
}

.offer-body {
  padding: 36px 36px 36px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}
.offer-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 2.6vw, 34px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.12;
  color: var(--color-text);
  margin: 0;
}
.offer-subtitle {
  font-size: 18px;
  line-height: 1.45;
  color: var(--color-secondary);
  margin: 0;
}
.offer-desc {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.65;
  margin: 0;
}
.offer-validity {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-subtle);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
.offer-validity-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary-glow);
}

@media (max-width: 720px) {
  .offer-card { grid-template-columns: 1fr; }
  .offer-media { min-height: 220px; }
  .offer-body { padding: 28px 26px; }
}
`;function fx(){return x.useEffect(()=>{document.title=`Offers — ${xe.name}`},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:dx}),o.jsx("section",{className:"offers-hero",children:o.jsxs("div",{className:"container offers-hero-inner",children:[o.jsx("span",{className:"eyebrow rise d-1",children:"Offers & happenings"}),o.jsxs("h1",{className:"rise d-2",children:["We don’t do flash sales.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"We do good reasons to come in."})]}),o.jsx("p",{className:"lede rise d-3",children:"A handful of recurring offers, a quiet member perk, and a Sunday tasting series. All available at every branch unless noted otherwise — no codes, no app, just walk in."})]})}),o.jsx("section",{className:"offers-grid-section",children:o.jsx("div",{className:"container",children:o.jsx("div",{className:"offers-grid",children:sx.map(r=>o.jsx(ux,{offer:r},r.id))})})}),o.jsx("section",{className:"offers-cta",children:o.jsxs("div",{className:"container offers-cta-inner",children:[o.jsx("span",{className:"eyebrow",children:"The Ember List"}),o.jsxs("h2",{className:"offers-cta-title",children:["Sign up once.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"A free burger every birthday."})]}),o.jsx("p",{className:"lede",children:"One email, twice a quarter at most: a new signature, an early seat at Smoke School, and a free signature burger every year on your birthday. We never share your address. Ever."}),o.jsx("a",{href:"/contact",className:"btn btn-primary",children:"Get in touch to join"})]})})]})}const dx=`
.offers-hero {
  padding: 180px 0 80px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 20% 80%, rgba(168, 52, 28, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(232, 184, 108, 0.08), transparent 60%);
}
.offers-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.offers-grid-section { padding: 80px 0; }
.offers-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.offers-cta {
  padding: 96px 0 128px;
  position: relative;
  border-top: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 500px at 50% 0%, rgba(201, 137, 61, 0.12), transparent 60%);
}
.offers-cta-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: center;
}
.offers-cta-title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin: 8px 0;
}
.offers-cta .lede { text-align: center; margin: 0 auto; }
`;function mx({branch:r}){return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:hx}),o.jsxs("article",{className:"branch-card",children:[o.jsxs("div",{className:"branch-media",children:[o.jsx("img",{src:r.image,alt:`Smoking Burgers — ${r.neighborhood}, ${r.city}`,loading:"lazy"}),o.jsxs("div",{className:"branch-media-overlay",children:[o.jsx("span",{className:"branch-city",children:r.city}),o.jsx("span",{className:"branch-neighborhood",children:r.neighborhood})]})]}),o.jsxs("div",{className:"branch-body",children:[o.jsx("p",{className:"branch-note",children:o.jsx("span",{className:"display-italic",children:r.note})}),o.jsxs("dl",{className:"branch-details",children:[o.jsxs("div",{className:"branch-detail-row",children:[o.jsx("dt",{children:"Address"}),o.jsx("dd",{children:r.address})]}),o.jsxs("div",{className:"branch-detail-row",children:[o.jsx("dt",{children:"Hours"}),o.jsxs("dd",{children:[r.hours,o.jsx("br",{}),r.weekendHours]})]}),o.jsxs("div",{className:"branch-detail-row",children:[o.jsx("dt",{children:"Phone"}),o.jsx("dd",{children:o.jsx("a",{href:`tel:${r.phone.replace(/\D/g,"")}`,children:r.phone})})]})]}),o.jsxs("a",{className:"branch-directions",href:r.directionsUrl,target:"_blank",rel:"noopener noreferrer","aria-label":`Get directions to ${r.neighborhood}, ${r.city} (opens in new tab)`,children:["Get directions",o.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none","aria-hidden":"true",focusable:"false",children:[o.jsx("path",{d:"M3 8 H13",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"}),o.jsx("path",{d:"M9 4 L13 8 L9 12",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})]})]})]})]})]})}const hx=`
.branch-card {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.5s var(--ease-cinematic), box-shadow 0.5s var(--ease-cinematic), border-color 0.4s var(--ease-out);
}
.branch-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.branch-media {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background: var(--color-bg-2);
}
.branch-media img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 1s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.95) contrast(1.05) brightness(0.92);
}
.branch-card:hover .branch-media img { transform: scale(1.05); filter: saturate(1.05) contrast(1.08) brightness(0.96); }
.branch-media::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(14, 11, 10, 0.78) 100%);
  pointer-events: none;
}
.branch-media-overlay {
  position: absolute;
  bottom: 22px; left: 24px;
  z-index: 2;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}
.branch-city {
  font-family: var(--font-body);
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--color-secondary);
  font-weight: 600;
}
.branch-neighborhood {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin-top: 4px;
}

.branch-body {
  padding: 32px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.branch-note {
  color: var(--color-text);
  font-size: 17px;
  line-height: 1.5;
  margin: 0;
}

.branch-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}
.branch-detail-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  align-items: start;
}
.branch-detail-row dt {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  padding-top: 3px;
  margin: 0;
}
.branch-detail-row dd {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-muted);
  line-height: 1.55;
}
.branch-detail-row dd a { color: var(--color-text-muted); }
.branch-detail-row dd a:hover { color: var(--color-secondary); }

.branch-directions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  align-self: flex-start;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 12px 20px;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  text-decoration: none;
  transition: background 0.3s var(--ease-out), color 0.3s var(--ease-out), border-color 0.3s var(--ease-out), transform 0.3s var(--ease-cinematic);
}
.branch-directions:hover {
  background: var(--color-primary);
  color: #1A1207;
  border-color: var(--color-primary);
  transform: translateY(-2px);
}
.branch-directions svg { transition: transform 0.3s var(--ease-cinematic); }
.branch-directions:hover svg { transform: translateX(3px); }

@media (max-width: 820px) {
  .branch-card { grid-template-columns: 1fr; }
  .branch-media { min-height: 260px; }
  .branch-body { padding: 26px 24px; }
}
@media (max-width: 480px) {
  .branch-detail-row { grid-template-columns: 1fr; gap: 4px; }
}
`;function px(){return x.useEffect(()=>{document.title=`Branches — ${xe.name}`},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:gx}),o.jsx("section",{className:"branches-hero",children:o.jsxs("div",{className:"container branches-hero-inner",children:[o.jsx("span",{className:"eyebrow rise d-1",children:"Find your fire"}),o.jsxs("h1",{className:"rise d-2",children:["Five rooms.",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"Each one its own."})]}),o.jsx("p",{className:"lede rise d-3",children:"Same philosophy, different rooms. A flagship Brooklyn smokehouse, a cocktail-first late-night room on the Lower East Side, a converted Chicago warehouse, an Austin patio, and a quiet LA loft."}),o.jsxs("dl",{className:"branches-stats rise d-4",children:[o.jsxs("div",{children:[o.jsx("dt",{children:"Branches"}),o.jsx("dd",{children:br.length})]}),o.jsxs("div",{children:[o.jsx("dt",{children:"Cities"}),o.jsx("dd",{children:new Set(br.map(r=>r.city)).size})]}),o.jsxs("div",{children:[o.jsx("dt",{children:"Open late"}),o.jsx("dd",{children:"Every night"})]})]})]})}),o.jsx("section",{className:"branches-list",children:o.jsx("div",{className:"container",children:o.jsx("div",{className:"branches-stack",children:br.map(r=>o.jsx(mx,{branch:r},r.id))})})})]})}const gx=`
.branches-hero {
  padding: 180px 0 80px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 100% 100%, rgba(232, 184, 108, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 0% 0%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.branches-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.branches-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-top: 28px;
  margin: 24px 0 0;
  border-top: 1px solid var(--color-border-hot);
  max-width: 620px;
}
.branches-stats div { display: flex; flex-direction: column; gap: 6px; }
.branches-stats dt {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  margin: 0;
}
.branches-stats dd {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.6vw, 42px);
  font-weight: 700;
  color: var(--color-secondary);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1;
}

.branches-list { padding: 80px 0 96px; }
.branches-stack {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (max-width: 620px) {
  .branches-stats { grid-template-columns: 1fr; gap: 20px; }
}
`,vx=["General","Catering","Franchise","Feedback"];function xx(){const[r,c]=x.useState(!1),[f,u]=x.useState({});function m(h){var D,Y,q;h.preventDefault();const g=h.currentTarget,w=new FormData(g),y=(D=w.get("name"))==null?void 0:D.trim(),p=(Y=w.get("email"))==null?void 0:Y.trim(),z=(q=w.get("message"))==null?void 0:q.trim(),E={};y||(E.name="Please tell us your name."),p?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)||(E.email="That email does not look quite right."):E.email="We need an email to write back.",z||(E.message="Add a short message so we know how to help."),u(E),Object.keys(E).length===0&&(c(!0),g.reset())}return r?o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Zm}),o.jsxs("div",{className:"contact-success",role:"status",children:[o.jsx("span",{className:"contact-success-mark","aria-hidden":"true",children:o.jsxs("svg",{width:"32",height:"32",viewBox:"0 0 32 32",fill:"none",children:[o.jsx("circle",{cx:"16",cy:"16",r:"15",stroke:"currentColor",strokeWidth:"1.5"}),o.jsx("path",{d:"M10 16.5 L14 20.5 L22 12.5",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round"})]})}),o.jsx("h3",{children:"Thank you — we have your note."}),o.jsxs("p",{children:["A real human, almost always within a business day, will write back from ",o.jsx("span",{className:"display-italic",children:"hello@smokingburgers.example"}),". For urgent catering & events, please also ring the Brooklyn flagship."]}),o.jsx("button",{type:"button",className:"btn btn-ghost",onClick:()=>c(!1),children:"Send another message"})]})]}):o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Zm}),o.jsxs("form",{className:"contact-form",noValidate:!0,onSubmit:m,"aria-label":"Contact Smoking Burgers",children:[o.jsxs("div",{className:"form-grid",children:[o.jsxs("div",{className:"field",children:[o.jsx("label",{htmlFor:"contact-name",children:"Your name"}),o.jsx("input",{id:"contact-name",name:"name",type:"text",autoComplete:"name","aria-required":"true","aria-invalid":!!f.name,"aria-describedby":f.name?"err-name":void 0}),f.name&&o.jsx("span",{className:"field-error",id:"err-name",role:"alert",children:f.name})]}),o.jsxs("div",{className:"field",children:[o.jsx("label",{htmlFor:"contact-email",children:"Email"}),o.jsx("input",{id:"contact-email",name:"email",type:"email",autoComplete:"email","aria-required":"true","aria-invalid":!!f.email,"aria-describedby":f.email?"err-email":void 0}),f.email&&o.jsx("span",{className:"field-error",id:"err-email",role:"alert",children:f.email})]})]}),o.jsxs("div",{className:"field",children:[o.jsx("label",{htmlFor:"contact-type",children:"Inquiry type"}),o.jsx("select",{id:"contact-type",name:"inquiryType",defaultValue:"General",children:vx.map(h=>o.jsx("option",{value:h,children:h},h))})]}),o.jsxs("div",{className:"field",children:[o.jsx("label",{htmlFor:"contact-message",children:"Message"}),o.jsx("textarea",{id:"contact-message",name:"message",rows:5,"aria-required":"true","aria-invalid":!!f.message,"aria-describedby":f.message?"err-message":void 0}),f.message&&o.jsx("span",{className:"field-error",id:"err-message",role:"alert",children:f.message})]}),o.jsx("button",{type:"submit",className:"btn btn-primary contact-submit",children:"Send the note"})]})]})}const Zm=`
.contact-form { display: flex; flex-direction: column; gap: 22px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.field { display: flex; flex-direction: column; }
.field-error {
  margin-top: 8px;
  color: #F2A085;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.contact-submit { align-self: flex-start; margin-top: 8px; }

.contact-success {
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border-hot);
  border-radius: var(--radius-xl);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.contact-success-mark {
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(201, 137, 61, 0.1);
  border: 1px solid var(--color-border-hot);
}
.contact-success h3 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}
.contact-success p {
  color: var(--color-text-muted);
  max-width: 52ch;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}
.contact-success .btn { margin-top: 8px; }

@media (max-width: 580px) {
  .form-grid { grid-template-columns: 1fr; }
}
`;function yx(){return x.useEffect(()=>{document.title=`Contact — ${xe.name}`},[]),o.jsxs(o.Fragment,{children:[o.jsx("style",{children:bx}),o.jsx("section",{className:"contact-hero",children:o.jsxs("div",{className:"container contact-hero-inner",children:[o.jsx("span",{className:"eyebrow rise d-1",children:"Say hello"}),o.jsxs("h1",{className:"rise d-2",children:["Catering, franchise,",o.jsx("br",{}),o.jsx("span",{className:"display-italic",children:"or just a kind word."})]}),o.jsx("p",{className:"lede rise d-3",children:"Whether you’re feeding fifteen people at the office, opening a Smoking Burgers in a new city, or want to tell us the brisket changed your week — we read every note."})]})}),o.jsx("section",{className:"contact-body",children:o.jsxs("div",{className:"container contact-grid",children:[o.jsx("div",{className:"contact-form-wrap",children:o.jsx(xx,{})}),o.jsxs("aside",{className:"contact-aside",children:[o.jsxs("div",{className:"contact-aside-card surface",children:[o.jsx("h3",{className:"contact-aside-title",children:"Reach us directly"}),o.jsxs("ul",{className:"contact-aside-list",children:[o.jsxs("li",{children:[o.jsx("span",{className:"contact-aside-label",children:"Email"}),o.jsx("a",{href:`mailto:${xe.hq.email}`,children:xe.hq.email})]}),o.jsxs("li",{children:[o.jsx("span",{className:"contact-aside-label",children:"Flagship phone"}),o.jsx("a",{href:`tel:${xe.hq.phone.replace(/\D/g,"")}`,children:xe.hq.phone})]}),o.jsxs("li",{children:[o.jsx("span",{className:"contact-aside-label",children:"Flagship address"}),o.jsxs("address",{className:"contact-aside-address",children:[xe.hq.line1,o.jsx("br",{}),xe.hq.line2]})]})]})]}),o.jsxs("div",{className:"contact-aside-card surface",children:[o.jsx("h3",{className:"contact-aside-title",children:"Inquiry hints"}),o.jsxs("dl",{className:"contact-aside-hints",children:[o.jsxs("div",{children:[o.jsx("dt",{children:"Catering"}),o.jsx("dd",{children:"Office lunches, weddings, neighbourhood blocks. Min. 15 people, 72 hours notice."})]}),o.jsxs("div",{children:[o.jsx("dt",{children:"Franchise"}),o.jsx("dd",{children:"We’re open to talking in select markets. Please include city, capital, and timeline."})]}),o.jsxs("div",{children:[o.jsx("dt",{children:"Feedback"}),o.jsx("dd",{children:"Bad meal? Great server? We genuinely read these and pass them to the right kitchen."})]})]})]}),o.jsxs("div",{className:"contact-aside-card contact-social-card",children:[o.jsx("h3",{className:"contact-aside-title",children:"Or come find us"}),o.jsx("ul",{className:"contact-social-list",children:xe.social.map(r=>o.jsx("li",{children:o.jsxs("a",{href:r.href,target:"_blank",rel:"noopener noreferrer",children:[o.jsx("span",{children:r.label}),o.jsx("span",{className:"contact-social-handle",children:r.handle})]})},r.label))})]})]})]})})]})}const bx=`
.contact-hero {
  padding: 180px 0 64px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 0% 100%, rgba(201, 137, 61, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.contact-hero-inner { max-width: 880px; display: flex; flex-direction: column; gap: 22px; }

.contact-body { padding: 80px 0 112px; }
.contact-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: start;
}
.contact-form-wrap { max-width: 640px; }

.contact-aside {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.contact-aside-card {
  padding: 28px 28px 30px;
}
.contact-aside-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--color-text);
}

.contact-aside-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.contact-aside-list li { display: flex; flex-direction: column; gap: 4px; }
.contact-aside-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
}
.contact-aside-list a {
  color: var(--color-text);
  font-size: 16px;
}
.contact-aside-list a:hover { color: var(--color-secondary); }
.contact-aside-address {
  color: var(--color-text);
  font-style: normal;
  font-size: 16px;
  line-height: 1.6;
}

.contact-aside-hints {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
}
.contact-aside-hints div { display: flex; flex-direction: column; gap: 4px; }
.contact-aside-hints dt {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}
.contact-aside-hints dd {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.55;
}

.contact-social-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2)); }
.contact-social-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.contact-social-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 16px;
  font-weight: 500;
  transition: color 0.2s ease, padding 0.25s var(--ease-cinematic);
}
.contact-social-list li:last-child a { border-bottom: none; }
.contact-social-list a:hover { color: var(--color-secondary); padding-left: 6px; }
.contact-social-handle { color: var(--color-text-subtle); font-size: 14px; font-weight: 400; }

@media (max-width: 980px) {
  .contact-grid { grid-template-columns: 1fr; gap: 48px; }
  .contact-form-wrap { max-width: none; }
}
`,Sx=r=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r);function tu(r){return r.trim()?Sx(r.trim())?"":"Enter a valid email address":"Email is required"}function au(r){return r?"":"Password is required"}function wx(){const r=tl(),c=x.useMemo(()=>new URLSearchParams(window.location.search).get("invitationCode")||void 0,[]),f=x.useMemo(()=>new URLSearchParams(window.location.search).get("message")==="password_reset_success",[]),[u,m]=x.useState(),[h,g]=x.useState(()=>f?void 0:gh()),[w,y]=x.useState(()=>f?"Your password has been reset. Please sign in with your new password.":c?`Sign in to redeem invitation ${c}. It will be linked to your account after you sign in.`:Lv()),[p,z]=x.useState(""),[E,D]=x.useState(""),[Y,q]=x.useState(!1),[k,H]=x.useState({}),[U,J]=x.useState({}),[L,F]=x.useState(!1),K=Z=>U[Z]?k[Z]:"";x.useEffect(()=>{document.title=`Sign in — ${xe.name}`},[]);function ee(Z){const ae=Jn.find(ie=>ie.id===Z);ae&&(g(void 0),y(void 0),m(Z),du(ae,{returnUrl:"/",invitationCode:c}).catch(ie=>{if(ie instanceof Ua){r("/terms");return}g(ie instanceof Error?ie.message:"Sign-in failed. Please try again."),m(void 0)}))}function G(Z,ae){if(Z==="email"&&z(ae),Z==="password"&&D(ae),h&&g(void 0),U[Z]){const ie=Z==="email"?tu(ae):au(ae);H(he=>{const ye={...he};return ie?ye[Z]=ie:delete ye[Z],ye})}}function oe(Z){J(he=>({...he,[Z]:!0}));const ae=Z==="email"?p:E,ie=Z==="email"?tu(ae):au(ae);H(he=>{const ye={...he};return ie?ye[Z]=ie:delete ye[Z],ye})}function W(Z){if(Z.preventDefault(),!Bt)return;J({email:!0,password:!0});const ae={},ie=tu(p),he=au(E);ie&&(ae.email=ie),he&&(ae.password=he),H(ae),!(Object.keys(ae).length>0)&&(F(!0),g(void 0),y(void 0),du(Bt,{returnUrl:"/",invitationCode:c,credentials:{credential:p.trim(),password:E,rememberMe:Y}}).catch(ye=>{if(ye instanceof Ua){r("/terms");return}g(ye instanceof Error?ye.message:"Sign-in failed. Please try again."),F(!1)}))}const V=L||!!u;return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Ex}),o.jsx("div",{className:"auth-page",children:o.jsxs("div",{className:"auth-card surface",children:[o.jsxs("header",{className:"auth-card-head",children:[o.jsx("span",{className:"eyebrow",children:"Welcome back"}),o.jsxs("h1",{className:"auth-title",children:["Sign in to ",xe.name]}),o.jsx("p",{className:"auth-lede",children:"Choose how you'd like to sign in."})]}),w&&o.jsx("div",{className:"auth-banner auth-banner-info",role:"status",children:w}),h&&o.jsx("div",{className:"auth-banner auth-banner-error",role:"alert",children:h}),Gl.length>0&&o.jsx("div",{className:"auth-providers",children:Gl.map(Z=>o.jsx("button",{type:"button",className:"btn btn-ghost auth-provider-btn",disabled:V,onClick:()=>ee(Z.id),children:u===Z.id?"Redirecting…":Z.displayName},Z.id))}),Bt&&Gl.length>0&&o.jsx("div",{className:"auth-divider",role:"separator","aria-label":"or sign in with email",children:o.jsx("span",{children:"or sign in with email"})}),Bt&&o.jsxs("form",{className:"auth-form",noValidate:!0,onSubmit:W,children:[o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"login-email",children:"Email"}),o.jsx("input",{id:"login-email",type:"email",autoComplete:"email",className:`auth-input${K("email")?" has-error":""}`,value:p,disabled:V,onChange:Z=>G("email",Z.target.value),onBlur:()=>oe("email")}),K("email")&&o.jsx("span",{className:"auth-field-error",role:"alert",children:k.email})]}),o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"login-password",children:"Password"}),o.jsx("input",{id:"login-password",type:"password",autoComplete:"current-password",className:`auth-input${K("password")?" has-error":""}`,value:E,disabled:V,onChange:Z=>G("password",Z.target.value),onBlur:()=>oe("password")}),K("password")&&o.jsx("span",{className:"auth-field-error",role:"alert",children:k.password})]}),o.jsxs("div",{className:"auth-row",children:[o.jsxs("label",{className:"auth-check",children:[o.jsx("input",{type:"checkbox",checked:Y,disabled:V,onChange:Z=>q(Z.target.checked)}),o.jsx("span",{children:"Remember me"})]}),o.jsx(Oe,{to:"/forgot-password",className:"auth-link",children:"Forgot password?"})]}),o.jsx("button",{type:"submit",className:"btn btn-primary auth-submit",disabled:V,children:L?"Signing in…":"Sign in"}),o.jsxs("p",{className:"auth-footer-link",children:["Don't have an account?"," ",o.jsx(Oe,{to:c?`/registration?invitationCode=${encodeURIComponent(c)}`:"/registration",children:"Create one"})]}),o.jsxs("p",{className:"auth-footer-link",children:["Have an invitation code?"," ",o.jsx(Oe,{to:"/redeem-invitation",children:"Redeem it"})]})]}),o.jsxs("p",{className:"auth-footnote",children:["By signing in you agree to our"," ",o.jsx(Oe,{to:"/terms",children:"terms and conditions"}),"."]})]})})]})}const Ex=`
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}

.auth-card {
  width: 100%;
  max-width: 560px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}

.auth-card-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auth-title {
  font-size: clamp(28px, 4vw, 40px);
}

.auth-lede {
  color: var(--color-text-muted);
  font-size: 16px;
}

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-info {
  background: rgba(232, 184, 108, 0.08);
  border-color: rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-providers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.auth-provider-btn {
  flex: 1 1 220px;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-provider-btn:disabled {
  opacity: 0.6;
  cursor: progress;
  transform: none;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-subtle);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
  transition: border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error {
  border-color: rgba(168, 52, 28, 0.7);
}
.auth-input:disabled { opacity: 0.6; }

.auth-field-error {
  font-size: 13px;
  color: #f3c2b6;
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.auth-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
}
.auth-check input { accent-color: var(--color-primary); }

.auth-link {
  font-size: 13px;
  color: var(--color-secondary);
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a {
  color: var(--color-secondary);
  text-decoration: none;
}
.auth-footer-link a:hover { text-decoration: underline; }

.auth-footnote {
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}
`,jx=r=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r),Nx=r=>/[a-z]/.test(r),Tx=r=>/[A-Z]/.test(r),zx=r=>/[0-9]/.test(r),Ax=r=>/[^A-Za-z0-9]/.test(r);function lu(r){return r.trim()?jx(r.trim())?"":"Enter a valid email address":"Email is required"}function nu(r){return r?r.length<8?"Password must be at least 8 characters":[Nx(r),Tx(r),zx(r),Ax(r)].filter(Boolean).length<3?"Use at least 3 of: lowercase, uppercase, digit, special character":"":"Password is required"}function gr(r,c){return c?c!==r?"Passwords do not match":"":"Please confirm your password"}const Cx=typeof window<"u"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1");function _x(){const r=tl(),{isAuthenticated:c}=Tr(),f=x.useMemo(()=>new URLSearchParams(window.location.search).get("invitationCode")||new URLSearchParams(window.location.search).get("invitation")||void 0,[]),[u,m]=x.useState(""),[h,g]=x.useState(""),[w,y]=x.useState(""),[p,z]=x.useState({}),[E,D]=x.useState({}),[Y,q]=x.useState(!1),[k,H]=x.useState(),[U,J]=x.useState(()=>gh()),L=W=>E[W]?p[W]:"";x.useEffect(()=>{document.title=`Create account — ${xe.name}`},[]),x.useEffect(()=>{c&&!Cx&&r("/",{replace:!0})},[c,r]),x.useEffect(()=>{f&&Bv(f).then(W=>{W.email&&m(W.email)}).catch(()=>{})},[f]);function F(W,V){if(W==="email"&&m(V),W==="password"&&g(V),W==="confirm"&&y(V),U&&J(void 0),E[W]){let Z="";W==="email"&&(Z=lu(V)),W==="password"&&(Z=nu(V)),W==="confirm"&&(Z=gr(h,V)),z(ae=>{const ie={...ae};if(Z?ie[W]=Z:delete ie[W],W==="password"&&E.confirm){const he=gr(V,w);he?ie.confirm=he:delete ie.confirm}return ie})}}function K(W){D(Z=>({...Z,[W]:!0}));let V="";W==="email"&&(V=lu(u)),W==="password"&&(V=nu(h)),W==="confirm"&&(V=gr(h,w)),z(Z=>{const ae={...Z};return V?ae[W]=V:delete ae[W],ae})}function ee(W){if(W.preventDefault(),!Bt)return;D({email:!0,password:!0,confirm:!0});const V=lu(u),Z=nu(h),ae=gr(h,w),ie={};V&&(ie.email=V),Z&&(ie.password=Z),ae&&(ie.confirm=ae),z(ie),!(Object.keys(ie).length>0)&&(q(!0),J(void 0),Ov({email:u.trim(),password:h,confirmPassword:w},"/",f).catch(he=>{if(he instanceof Ua){r("/terms");return}J(he instanceof Error?he.message:"Registration failed. Please try again."),q(!1)}))}function G(W){const V=Jn.find(Z=>Z.id===W);V&&(J(void 0),H(W),du(V,{returnUrl:"/",invitationCode:f}).catch(Z=>{if(Z instanceof Ua){r("/terms");return}J(Z instanceof Error?Z.message:"Sign-up failed. Please try again."),H(void 0)}))}const oe=Y||!!k;return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Rx}),o.jsx("div",{className:"auth-page",children:o.jsxs("div",{className:"auth-card surface",children:[o.jsxs("header",{className:"auth-card-head",children:[o.jsx("span",{className:"eyebrow",children:"Join us"}),o.jsxs("h1",{className:"auth-title",children:["Create your ",xe.name," account"]}),o.jsx("p",{className:"auth-lede",children:f?"Complete sign-up to redeem your invitation.":"Sign up to track orders, save favorites, and get exclusive offers."})]}),f&&o.jsxs("div",{className:"auth-banner auth-banner-info",role:"status",children:["You're redeeming invitation ",o.jsx("strong",{children:f}),"."]}),U&&o.jsx("div",{className:"auth-banner auth-banner-error",role:"alert",children:U}),Gl.length>0&&o.jsx("div",{className:"auth-providers",children:Gl.map(W=>o.jsx("button",{type:"button",className:"btn btn-ghost auth-provider-btn",disabled:oe,onClick:()=>G(W.id),children:k===W.id?"Redirecting…":`Sign up with ${W.displayName.replace(/^Sign in with /i,"").replace(/ sign in$/i,"")}`},W.id))}),Bt&&Gl.length>0&&o.jsx("div",{className:"auth-divider",role:"separator","aria-label":"or sign up with email",children:o.jsx("span",{children:"or sign up with email"})}),Bt&&o.jsxs("form",{className:"auth-form",noValidate:!0,onSubmit:ee,children:[o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"reg-email",children:"Email"}),o.jsx("input",{id:"reg-email",type:"email",autoComplete:"email",className:`auth-input${L("email")?" has-error":""}`,value:u,disabled:oe,onChange:W=>F("email",W.target.value),onBlur:()=>K("email")}),L("email")&&o.jsx("span",{className:"auth-field-error",role:"alert",children:p.email})]}),o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"reg-password",children:"Password"}),o.jsx("input",{id:"reg-password",type:"password",autoComplete:"new-password",className:`auth-input${L("password")?" has-error":""}`,value:h,disabled:oe,onChange:W=>F("password",W.target.value),onBlur:()=>K("password")}),L("password")?o.jsx("span",{className:"auth-field-error",role:"alert",children:p.password}):o.jsx("span",{className:"auth-help",children:"At least 8 characters, including 3 of: lowercase, uppercase, digit, special character."})]}),o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"reg-confirm",children:"Confirm password"}),o.jsx("input",{id:"reg-confirm",type:"password",autoComplete:"new-password",className:`auth-input${L("confirm")?" has-error":""}`,value:w,disabled:oe,onChange:W=>F("confirm",W.target.value),onBlur:()=>K("confirm")}),L("confirm")&&o.jsx("span",{className:"auth-field-error",role:"alert",children:p.confirm})]}),o.jsx("button",{type:"submit",className:"btn btn-primary auth-submit",disabled:oe,children:Y?"Creating account…":"Create account"}),o.jsxs("p",{className:"auth-footer-link",children:["Already have an account? ",o.jsx(Oe,{to:"/login",children:"Sign in"})]})]}),o.jsxs("p",{className:"auth-footnote",children:["By creating an account you agree to our"," ",o.jsx(Oe,{to:"/terms",children:"terms and conditions"}),"."]})]})})]})}const Rx=`
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}

.auth-card {
  width: 100%;
  max-width: 560px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}

.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }
.auth-lede { color: var(--color-text-muted); font-size: 16px; }

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-info {
  background: rgba(232, 184, 108, 0.08);
  border-color: rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-providers { display: flex; flex-wrap: wrap; gap: 12px; }
.auth-provider-btn {
  flex: 1 1 220px;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-provider-btn:disabled { opacity: 0.6; cursor: progress; transform: none; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-subtle);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
  transition: border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error { border-color: rgba(168, 52, 28, 0.7); }
.auth-input:disabled { opacity: 0.6; }

.auth-field-error { font-size: 13px; color: #f3c2b6; }
.auth-help { font-size: 12px; color: var(--color-text-subtle); }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }

.auth-footnote {
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}
`,Ox=r=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r);function iu(r){return r.trim()?Ox(r.trim())?"":"Enter a valid email address":"Email is required"}function Mx(){const[r,c]=x.useState(""),[f,u]=x.useState(""),[m,h]=x.useState(!1),[g,w]=x.useState(),[y,p]=x.useState(!1),[z,E]=x.useState(!1);x.useEffect(()=>{document.title=`Reset password — ${xe.name}`},[]);function D(k){c(k),g&&w(void 0),m&&u(iu(k))}function Y(){h(!0),u(iu(r))}function q(k){k.preventDefault(),h(!0);const H=iu(r);u(H),!H&&(E(!0),w(void 0),Mv(r.trim()).then(()=>{p(!0),E(!1)}).catch(U=>{w(U instanceof Error?U.message:"Could not send the reset email. Please try again."),E(!1)}))}return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Dx}),o.jsx("div",{className:"auth-page",children:o.jsxs("div",{className:"auth-card surface",children:[o.jsxs("header",{className:"auth-card-head",children:[o.jsx("span",{className:"eyebrow",children:"Forgot password"}),o.jsx("h1",{className:"auth-title",children:"Reset your password"}),o.jsx("p",{className:"auth-lede",children:"Enter the email address on your account and we'll send you a link to reset your password."})]}),y?o.jsxs("div",{className:"auth-success",role:"status",children:[o.jsx("span",{className:"auth-success-check","aria-hidden":"true",children:"✓"}),o.jsxs("p",{children:["We've sent a password reset link to ",o.jsx("strong",{children:r}),". Please check your inbox and follow the instructions. The link expires after a short time."]}),o.jsx(Oe,{to:"/login",className:"btn btn-primary auth-submit",children:"Back to sign in"})]}):o.jsxs(o.Fragment,{children:[g&&o.jsx("div",{className:"auth-banner auth-banner-error",role:"alert",children:g}),o.jsxs("form",{className:"auth-form",noValidate:!0,onSubmit:q,children:[o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"fp-email",children:"Email"}),o.jsx("input",{id:"fp-email",type:"email",autoComplete:"email",className:`auth-input${m&&f?" has-error":""}`,value:r,disabled:z,onChange:k=>D(k.target.value),onBlur:Y}),m&&f&&o.jsx("span",{className:"auth-field-error",role:"alert",children:f})]}),o.jsx("button",{type:"submit",className:"btn btn-primary auth-submit",disabled:z,children:z?"Sending…":"Send reset link"}),o.jsxs("p",{className:"auth-footer-link",children:["Remembered it? ",o.jsx(Oe,{to:"/login",children:"Back to sign in"})]})]})]})]})})]})}const Dx=`
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.auth-card {
  width: 100%;
  max-width: 480px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }
.auth-lede { color: var(--color-text-muted); font-size: 16px; }

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-label {
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--color-text-muted);
}
.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error { border-color: rgba(168, 52, 28, 0.7); }
.auth-input:disabled { opacity: 0.6; }

.auth-field-error { font-size: 13px; color: #f3c2b6; }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
  text-decoration: none;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }

.auth-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}
.auth-success-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(46, 125, 50, 0.18);
  color: #6dd26d;
  font-size: 24px;
  font-weight: 700;
}
.auth-success p {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.6;
}
`,Ux=r=>/[a-z]/.test(r),Bx=r=>/[A-Z]/.test(r),kx=r=>/[0-9]/.test(r),Lx=r=>/[^A-Za-z0-9]/.test(r);function ru(r){return r?r.length<8?"Password must be at least 8 characters":[Ux(r),Bx(r),kx(r),Lx(r)].filter(Boolean).length<3?"Use at least 3 of: lowercase, uppercase, digit, special character":"":"Password is required"}function vr(r,c){return c?c!==r?"Passwords do not match":"":"Please confirm your password"}function Hx(){const{userId:r,code:c}=x.useMemo(()=>{const L=new URLSearchParams(window.location.search);return{userId:L.get("UserId")||L.get("userId")||"",code:L.get("Code")||L.get("code")||""}},[]),[f,u]=x.useState(""),[m,h]=x.useState(""),[g,w]=x.useState({}),[y,p]=x.useState({}),[z,E]=x.useState(),[D,Y]=x.useState(!1);x.useEffect(()=>{document.title=`Reset password — ${xe.name}`},[]);const q=L=>y[L]?g[L]:"",k=!r||!c;function H(L,F){if(L==="password"&&u(F),L==="confirm"&&h(F),z&&E(void 0),y[L]){const K=L==="password"?ru(F):vr(f,F);w(ee=>{const G={...ee};if(K?G[L]=K:delete G[L],L==="password"&&y.confirm){const oe=vr(F,m);oe?G.confirm=oe:delete G.confirm}return G})}}function U(L){p(K=>({...K,[L]:!0}));const F=L==="password"?ru(f):vr(f,m);w(K=>{const ee={...K};return F?ee[L]=F:delete ee[L],ee})}function J(L){L.preventDefault(),p({password:!0,confirm:!0});const F=ru(f),K=vr(f,m),ee={};F&&(ee.password=F),K&&(ee.confirm=K),w(ee),!(Object.keys(ee).length>0)&&(Y(!0),E(void 0),Dv(r,c,f,m).catch(G=>{E(G instanceof Error?G.message:"Password reset failed. The link may have expired."),Y(!1)}))}return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:qx}),o.jsx("div",{className:"auth-page",children:o.jsxs("div",{className:"auth-card surface",children:[o.jsxs("header",{className:"auth-card-head",children:[o.jsx("span",{className:"eyebrow",children:"Reset password"}),o.jsx("h1",{className:"auth-title",children:"Choose a new password"})]}),k?o.jsxs("div",{className:"auth-banner auth-banner-error",role:"alert",children:[o.jsx("p",{style:{margin:0},children:"This reset link is invalid or has expired."}),o.jsx("p",{style:{margin:"8px 0 0"},children:o.jsx(Oe,{to:"/forgot-password",className:"auth-link",children:"Request a new reset link"})})]}):o.jsxs(o.Fragment,{children:[z&&o.jsx("div",{className:"auth-banner auth-banner-error",role:"alert",children:z}),o.jsxs("form",{className:"auth-form",noValidate:!0,onSubmit:J,children:[o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"rp-password",children:"New password"}),o.jsx("input",{id:"rp-password",type:"password",autoComplete:"new-password",className:`auth-input${q("password")?" has-error":""}`,value:f,disabled:D,onChange:L=>H("password",L.target.value),onBlur:()=>U("password")}),q("password")?o.jsx("span",{className:"auth-field-error",role:"alert",children:g.password}):o.jsx("span",{className:"auth-help",children:"At least 8 characters, including 3 of: lowercase, uppercase, digit, special character."})]}),o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"rp-confirm",children:"Confirm new password"}),o.jsx("input",{id:"rp-confirm",type:"password",autoComplete:"new-password",className:`auth-input${q("confirm")?" has-error":""}`,value:m,disabled:D,onChange:L=>H("confirm",L.target.value),onBlur:()=>U("confirm")}),q("confirm")&&o.jsx("span",{className:"auth-field-error",role:"alert",children:g.confirm})]}),o.jsx("button",{type:"submit",className:"btn btn-primary auth-submit",disabled:D,children:D?"Resetting…":"Reset password"}),o.jsx("p",{className:"auth-footer-link",children:o.jsx(Oe,{to:"/login",children:"Back to sign in"})})]})]})]})})]})}const qx=`
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.auth-card {
  width: 100%;
  max-width: 480px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-label {
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--color-text-muted);
}
.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error { border-color: rgba(168, 52, 28, 0.7); }
.auth-input:disabled { opacity: 0.6; }

.auth-field-error { font-size: 13px; color: #f3c2b6; }
.auth-help { font-size: 12px; color: var(--color-text-subtle); }

.auth-link {
  color: var(--color-secondary);
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }
`;function ou(r){return!r||!r.trim()?"Invitation code is required":""}function Yx(){const r=tl(),c=(()=>{const U=new URLSearchParams(window.location.search);return U.get("invitation")||U.get("InvitationCode")||U.get("invitationCode")||U.get("code")||""})(),[f,u]=x.useState(c),[m,h]=x.useState(!1),[g,w]=x.useState(""),[y,p]=x.useState(!1),[z,E]=x.useState(),[D,Y]=x.useState(!1);x.useEffect(()=>{document.title=`Redeem invitation — ${xe.name}`},[]);function q(U){u(U),z&&E(void 0),y&&w(ou(U))}function k(){p(!0),w(ou(f))}function H(U){U.preventDefault(),p(!0);const J=ou(f);w(J),!J&&(Y(!0),E(void 0),Uv(f.trim(),m).then(L=>{const F=L.nextStep==="register"?"/registration":"/login";r(`${F}?invitationCode=${encodeURIComponent(f.trim())}`)}).catch(L=>{E(L instanceof Error?L.message:"Unable to verify invitation."),Y(!1)}))}return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Gx}),o.jsx("div",{className:"auth-page",children:o.jsxs("div",{className:"auth-card surface",children:[o.jsxs("header",{className:"auth-card-head",children:[o.jsx("span",{className:"eyebrow",children:"You're invited"}),o.jsx("h1",{className:"auth-title",children:"Redeem your invitation"}),o.jsx("p",{className:"auth-lede",children:"Enter the invitation code from your email to continue."})]}),z&&o.jsx("div",{className:"auth-banner auth-banner-error",role:"alert",children:z}),o.jsxs("form",{className:"auth-form",noValidate:!0,onSubmit:H,children:[o.jsxs("div",{className:"auth-field",children:[o.jsx("label",{className:"auth-label",htmlFor:"inv-code",children:"Invitation code"}),o.jsx("input",{id:"inv-code",type:"text",autoComplete:"off",className:`auth-input${y&&g?" has-error":""}`,value:f,disabled:D,onChange:U=>q(U.target.value),onBlur:k}),y&&g&&o.jsx("span",{className:"auth-field-error",role:"alert",children:g})]}),o.jsxs("label",{className:"auth-check",children:[o.jsx("input",{type:"checkbox",checked:m,disabled:D,onChange:U=>h(U.target.checked)}),o.jsx("span",{children:"Sign in with an existing account instead of registering"})]}),o.jsx("button",{type:"submit",className:"btn btn-primary auth-submit",disabled:D,children:D?"Verifying…":"Continue"}),o.jsx("p",{className:"auth-footer-link",children:o.jsx(Oe,{to:"/login",children:"Back to sign in"})})]})]})})]})}const Gx=`
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.auth-card {
  width: 100%;
  max-width: 480px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }
.auth-lede { color: var(--color-text-muted); font-size: 16px; }

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-label {
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--color-text-muted);
}
.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error { border-color: rgba(168, 52, 28, 0.7); }
.auth-input:disabled { opacity: 0.6; }

.auth-field-error { font-size: 13px; color: #f3c2b6; }

.auth-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
}
.auth-check input { accent-color: var(--color-primary); }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }
`,Km={firstname:"",lastname:"",emailaddress1:"",mobilephone:"",address1_line1:"",address1_line2:"",address1_city:"",address1_stateorprovince:"",address1_postalcode:"",address1_country:""},Jm=["firstname","lastname","mobilephone","address1_line1","address1_line2","address1_city","address1_stateorprovince","address1_postalcode","address1_country"];function Xx(){var oe,W;const{user:r,isLoading:c,refresh:f}=Tr(),[u,m]=x.useState(Km),[h,g]=x.useState(Km),[w,y]=x.useState(),[p,z]=x.useState(!0),[E,D]=x.useState(),[Y,q]=x.useState(),[k,H]=x.useState(!1);if(x.useEffect(()=>{document.title=`Profile — ${xe.name}`},[]),x.useEffect(()=>{r&&(z(!0),y(void 0),Xv().then(V=>{m(V),g(V)}).catch(V=>{y(V instanceof Error?V.message:"Could not load profile.")}).finally(()=>{z(!1)}))},[r]),c)return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:su}),o.jsx("div",{className:"profile-page",children:o.jsx("div",{className:"profile-card surface","aria-busy":"true",children:o.jsx("p",{children:"Loading profile…"})})})]});if(!r)return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:su}),o.jsx("div",{className:"profile-page",children:o.jsxs("div",{className:"profile-card surface",children:[o.jsx("h1",{className:"profile-title",children:"Profile"}),o.jsx("p",{className:"profile-lede",children:"You need to sign in to view your profile."}),o.jsx(Oe,{to:"/login",className:"btn btn-primary",children:"Sign in"})]})})]});const U=(u.firstname[0]||u.lastname[0]||u.emailaddress1[0]||((oe=r.email)==null?void 0:oe[0])||((W=r.userName)==null?void 0:W[0])||"?").toUpperCase(),J=[u.firstname,u.lastname].filter(Boolean).join(" ")||r.userName||"User",L=Jm.some(V=>(u[V]||"").trim()!==(h[V]||"").trim());function F(V,Z){m(ae=>({...ae,[V]:Z})),E&&D(void 0),Y&&q(void 0)}function K(V){if(V.preventDefault(),!L)return;const Z={};for(const ae of Jm){const ie=(u[ae]||"").trim(),he=(h[ae]||"").trim();ie!==he&&(Z[ae]=ie)}H(!0),D(void 0),q(void 0),Vv(Z).then(()=>{q("Profile updated."),g(u),f(),H(!1)}).catch(ae=>{D(ae instanceof Error?ae.message:"Could not save profile."),H(!1)})}const ee=r.userRoles||[],G=u.emailaddress1||r.email||r.userName;return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:su}),o.jsx("div",{className:"profile-page",children:o.jsxs("div",{className:"profile-card surface",children:[o.jsxs("header",{className:"profile-head",children:[o.jsx("span",{className:"profile-avatar","aria-hidden":"true",children:U}),o.jsxs("div",{className:"profile-head-text",children:[o.jsx("h1",{className:"profile-title",children:J}),o.jsx("p",{className:"profile-email",children:G})]})]}),o.jsxs("section",{className:"profile-section",children:[o.jsx("h2",{className:"profile-section-title",children:"Account details"}),o.jsxs("dl",{className:"profile-info",children:[o.jsx("dt",{children:"Email"}),o.jsx("dd",{children:G||o.jsx("span",{className:"profile-muted",children:"Not set"})}),o.jsx("dt",{children:"Sign-in identifier"}),o.jsx("dd",{className:"profile-mono",children:r.userName}),o.jsx("dt",{children:"Contact ID"}),o.jsx("dd",{className:"profile-mono",children:r.contactId}),o.jsx("dt",{children:"Roles"}),o.jsx("dd",{children:ee.length>0?o.jsx("ul",{className:"profile-roles",children:ee.map(V=>o.jsx("li",{children:o.jsx("span",{className:"profile-role-chip",children:V})},V))}):o.jsx("span",{className:"profile-muted",children:"No roles assigned"})})]})]}),o.jsxs("section",{className:"profile-section",children:[o.jsx("h2",{className:"profile-section-title",children:"Edit profile"}),w&&o.jsx("div",{className:"profile-banner profile-banner-error",role:"alert",children:w}),E&&o.jsx("div",{className:"profile-banner profile-banner-error",role:"alert",children:E}),Y&&o.jsx("div",{className:"profile-banner profile-banner-success",role:"status",children:Y}),p?o.jsx("p",{className:"profile-muted",children:"Loading current values…"}):o.jsxs("form",{className:"profile-form",noValidate:!0,onSubmit:K,children:[o.jsxs("div",{className:"profile-grid",children:[o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-firstname",children:"First name"}),o.jsx("input",{id:"p-firstname",type:"text",autoComplete:"given-name",className:"profile-input",value:u.firstname,disabled:k,onChange:V=>F("firstname",V.target.value)})]}),o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-lastname",children:"Last name"}),o.jsx("input",{id:"p-lastname",type:"text",autoComplete:"family-name",className:"profile-input",value:u.lastname,disabled:k,onChange:V=>F("lastname",V.target.value)})]}),o.jsxs("div",{className:"profile-field profile-field-full",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-mobile",children:"Mobile phone"}),o.jsx("input",{id:"p-mobile",type:"tel",autoComplete:"tel",className:"profile-input",value:u.mobilephone,disabled:k,onChange:V=>F("mobilephone",V.target.value)})]})]}),o.jsx("h3",{className:"profile-subsection-title",children:"Address"}),o.jsxs("div",{className:"profile-grid",children:[o.jsxs("div",{className:"profile-field profile-field-full",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-line1",children:"Street address"}),o.jsx("input",{id:"p-line1",type:"text",autoComplete:"address-line1",className:"profile-input",value:u.address1_line1,disabled:k,onChange:V=>F("address1_line1",V.target.value)})]}),o.jsxs("div",{className:"profile-field profile-field-full",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-line2",children:"Apartment, suite, etc. (optional)"}),o.jsx("input",{id:"p-line2",type:"text",autoComplete:"address-line2",className:"profile-input",value:u.address1_line2,disabled:k,onChange:V=>F("address1_line2",V.target.value)})]}),o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-city",children:"City"}),o.jsx("input",{id:"p-city",type:"text",autoComplete:"address-level2",className:"profile-input",value:u.address1_city,disabled:k,onChange:V=>F("address1_city",V.target.value)})]}),o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-state",children:"State / Province"}),o.jsx("input",{id:"p-state",type:"text",autoComplete:"address-level1",className:"profile-input",value:u.address1_stateorprovince,disabled:k,onChange:V=>F("address1_stateorprovince",V.target.value)})]}),o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-postal",children:"Postal code"}),o.jsx("input",{id:"p-postal",type:"text",autoComplete:"postal-code",className:"profile-input",value:u.address1_postalcode,disabled:k,onChange:V=>F("address1_postalcode",V.target.value)})]}),o.jsxs("div",{className:"profile-field",children:[o.jsx("label",{className:"profile-label",htmlFor:"p-country",children:"Country"}),o.jsx("input",{id:"p-country",type:"text",autoComplete:"country-name",className:"profile-input",value:u.address1_country,disabled:k,onChange:V=>F("address1_country",V.target.value)})]})]}),o.jsx("button",{type:"submit",className:"btn btn-primary",disabled:!L||k||!!w,children:k?"Saving…":"Save changes"})]})]}),Bt&&o.jsxs("section",{className:"profile-section",children:[o.jsx("h2",{className:"profile-section-title",children:"Password"}),o.jsx("p",{className:"profile-lede",children:"To change your password, request a reset link via email."}),o.jsx(Oe,{to:"/forgot-password",className:"btn btn-ghost",children:"Send password reset link"})]}),o.jsx("section",{className:"profile-section profile-actions",children:o.jsx("button",{type:"button",className:"btn btn-ghost",onClick:()=>ph("/"),children:"Sign out"})})]})})]})}const su=`
.profile-page {
  min-height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}

.profile-card {
  width: 100%;
  max-width: 720px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #1A1207;
  font-size: 26px;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.profile-title {
  font-size: clamp(24px, 3.4vw, 32px);
  margin: 0;
  word-break: break-word;
}
.profile-email {
  color: var(--color-text-muted);
  font-size: 14px;
  word-break: break-all;
}
.profile-lede {
  color: var(--color-text-muted);
  font-size: 14px;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}
.profile-section:first-of-type {
  padding-top: 0;
  border-top: none;
}

.profile-section-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}
.profile-subsection-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  margin: var(--space-3) 0 0;
}

.profile-info {
  display: grid;
  grid-template-columns: minmax(120px, max-content) 1fr;
  gap: 8px 20px;
  margin: 0;
}
.profile-info dt {
  font-size: 13px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
}
.profile-info dd {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
  word-break: break-word;
}
.profile-muted { color: var(--color-text-subtle); }
.profile-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  color: var(--color-text-muted);
}

.profile-roles {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.profile-role-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 184, 108, 0.12);
  border: 1px solid rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.profile-form { display: flex; flex-direction: column; gap: var(--space-3); }
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.profile-field-full { grid-column: 1 / -1; }
.profile-field { display: flex; flex-direction: column; gap: 6px; }
.profile-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.profile-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
}
.profile-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.profile-input:disabled { opacity: 0.6; }

.profile-banner {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  border: 1px solid;
}
.profile-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}
.profile-banner-success {
  background: rgba(46, 125, 50, 0.16);
  border-color: rgba(46, 125, 50, 0.45);
  color: #b9e9b9;
}

.profile-actions { align-items: flex-start; }

@media (max-width: 600px) {
  .profile-grid { grid-template-columns: 1fr; }
}
`,$m="Terms and Conditions",Vx=`
  <p>By using this site, you agree to the following terms of service.</p>
  <h3>1. Acceptance of Terms</h3>
  <p>By accessing and using this site, you accept and agree to be bound by these terms.</p>
  <h3>2. Privacy &amp; Data</h3>
  <p>We collect and process your personal data in accordance with our privacy policy.</p>
  <h3>3. Account Responsibility</h3>
  <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
  <h3>4. Changes to Terms</h3>
  <p>We reserve the right to update these terms at any time.</p>
`,Qx="I agree to these terms and conditions.",Zx="Confirm";function Kx(){const[r,c]=x.useState(!1),[f,u]=x.useState(!1),[m,h]=x.useState();x.useEffect(()=>{document.title=`${$m} — ${xe.name}`},[]);function g(){!r||f||(u(!0),h(void 0),Hv("/").catch(w=>{h(w instanceof Error?w.message:"Failed to accept terms. Please try again."),u(!1)}))}return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:Jx}),o.jsx("div",{className:"terms-page",children:o.jsxs("div",{className:"terms-card surface",children:[o.jsxs("header",{className:"terms-head",children:[o.jsx("span",{className:"eyebrow",children:"Almost there"}),o.jsx("h1",{className:"terms-title",children:$m})]}),m&&o.jsx("div",{className:"terms-banner",role:"alert",children:m}),o.jsx("div",{className:"terms-body",dangerouslySetInnerHTML:{__html:Vx}}),o.jsxs("label",{className:"terms-agree",children:[o.jsx("input",{type:"checkbox",checked:r,onChange:w=>c(w.target.checked)}),o.jsx("span",{children:Qx})]}),o.jsxs("div",{className:"terms-actions",children:[o.jsx("button",{type:"button",className:"btn btn-primary",onClick:g,disabled:!r||f,children:f?"Confirming…":Zx}),o.jsx(Oe,{to:"/login",className:"terms-back",children:"Back to sign in"})]})]})})]})}const Jx=`
.terms-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(96px, 14vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.terms-card {
  width: 100%;
  max-width: 720px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.terms-head { display: flex; flex-direction: column; gap: var(--space-3); }
.terms-title { font-size: clamp(28px, 4vw, 40px); }
.terms-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: rgba(168, 52, 28, 0.12);
  border: 1px solid rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
  font-size: 14px;
}
.terms-body {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.7;
  background: rgba(0,0,0,0.18);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  max-height: 360px;
  overflow-y: auto;
}
.terms-body h3 {
  font-size: 18px;
  margin-top: 18px;
  margin-bottom: 6px;
  color: var(--color-text);
}
.terms-body p { margin-bottom: 10px; }
.terms-agree {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
}
.terms-agree input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
}
.terms-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.terms-back {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
`,$x=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;function Fx(){const r=tl(),[c,f]=x.useState(null),[u,m]=x.useState(""),[h,g]=x.useState(!0),[w,y]=x.useState(!1),[p,z]=x.useState(!1),[E,D]=x.useState(),[Y,q]=x.useState(!1),[k,H]=x.useState();x.useEffect(()=>{document.title=`Complete sign-up — ${xe.name}`},[]),x.useEffect(()=>{let K=!1;return qv().then(ee=>{K||(f(ee),m(ee.email),g(!1))}).catch(ee=>{K||(ee instanceof mu?z(!0):H(ee instanceof Error?ee.message:"Could not load sign-up details. Please try again."),g(!1))}),()=>{K=!0}},[]);function U(K){if(!K.trim())return"Email is required.";if(!$x.test(K.trim()))return"Enter a valid email address."}function J(K){m(K),Y&&D(U(K)),k&&H(void 0)}function L(){q(!0),D(U(u))}function F(K){if(K.preventDefault(),!c)return;q(!0);const ee=U(u);D(ee),!ee&&(y(!0),H(void 0),Yv({...c,email:u.trim()}).catch(G=>{if(G instanceof Ua){r("/terms");return}if(G instanceof mu){z(!0),y(!1);return}H(G instanceof Error?G.message:"Unable to complete sign-up. Please try again."),y(!1)}))}return o.jsxs(o.Fragment,{children:[o.jsx("style",{children:ey}),o.jsx("div",{className:"conf-page",children:o.jsx("div",{className:"conf-card surface",children:p?o.jsx(Ix,{}):h?o.jsx(Wx,{}):c?o.jsxs("form",{onSubmit:F,noValidate:!0,children:[o.jsxs("header",{className:"conf-head",children:[o.jsx("span",{className:"eyebrow",children:"One last step"}),o.jsx("h1",{className:"conf-title",children:"Complete your sign-up"}),o.jsx("p",{className:"conf-lede",children:"We just need to confirm a few details before creating your account."})]}),c.invitationCode&&o.jsxs("div",{className:"conf-banner conf-banner-info",role:"status",children:["Redeeming invitation ",o.jsx("strong",{children:c.invitationCode})]}),k&&o.jsx("div",{className:"conf-banner conf-banner-error",role:"alert",children:k}),(c.firstName||c.lastName)&&o.jsxs("div",{className:"conf-field-readonly",children:[o.jsx("label",{children:"Name"}),o.jsx("p",{children:`${c.firstName} ${c.lastName}`.trim()})]}),o.jsxs("div",{className:"conf-field",children:[o.jsx("label",{htmlFor:"conf-email",children:"Email"}),o.jsx("input",{id:"conf-email",type:"email",autoComplete:"email",value:u,onChange:K=>J(K.target.value),onBlur:L,"aria-invalid":!!(Y&&E),"aria-describedby":Y&&E?"conf-email-error":void 0}),Y&&E&&o.jsx("p",{id:"conf-email-error",className:"conf-field-error",children:E})]}),o.jsxs("div",{className:"conf-actions",children:[o.jsx("button",{type:"submit",className:"btn btn-primary",disabled:w,children:w?"Creating account…":"Create my account"}),o.jsx(Oe,{to:"/login",className:"conf-back",children:"Cancel"})]})]}):o.jsx(Px,{message:k})})})]})}function Wx(){return o.jsxs("div",{className:"conf-status",children:[o.jsx("span",{className:"auth-spinner","aria-hidden":"true"}),o.jsx("p",{children:"Loading your details…"})]})}function Ix(){return o.jsxs("div",{className:"conf-status",children:[o.jsx("h1",{className:"conf-title",children:"Sign-in session expired"}),o.jsx("p",{children:"The sign-in session expired before you could finish. Please try again."}),o.jsx(Oe,{to:"/login",className:"btn btn-primary",children:"Back to sign in"})]})}function Px({message:r}){return o.jsxs("div",{className:"conf-status",children:[o.jsx("h1",{className:"conf-title",children:"Something went wrong"}),o.jsx("p",{children:r??"Unable to complete sign-up."}),o.jsx(Oe,{to:"/login",className:"btn btn-primary",children:"Back to sign in"})]})}const ey=`
.conf-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(96px, 14vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.conf-card {
  width: 100%;
  max-width: 560px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.conf-head { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
.conf-title { font-size: clamp(26px, 4vw, 36px); }
.conf-lede { color: var(--color-text-muted); }
.conf-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
  margin-bottom: var(--space-3);
}
.conf-banner-info {
  background: rgba(232, 184, 108, 0.08);
  border-color: rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
}
.conf-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}
.conf-field-readonly {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-4);
}
.conf-field-readonly p {
  font-size: 16px;
  color: var(--color-text);
  margin: 0;
}
.conf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-5);
}
.conf-field-error {
  font-size: 13px;
  color: #f3c2b6;
  margin: 4px 0 0;
}
.conf-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.conf-back {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.conf-status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}
.conf-status .auth-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-text-muted);
  border-right-color: transparent;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }
`;function ty({children:r,fallback:c}){const{isAuthenticated:f,isLoading:u}=Tr();return u?null:f?o.jsx(o.Fragment,{children:r}):o.jsx(o.Fragment,{children:c})}function ay(){return o.jsx(ex,{children:o.jsxs($0,{children:[o.jsx(lt,{path:"/",element:o.jsx(nx,{})}),o.jsx(lt,{path:"/menu",element:o.jsx(rx,{})}),o.jsx(lt,{path:"/offers",element:o.jsx(fx,{})}),o.jsx(lt,{path:"/branches",element:o.jsx(px,{})}),o.jsx(lt,{path:"/contact",element:o.jsx(yx,{})}),o.jsx(lt,{path:"/login",element:o.jsx(wx,{})}),o.jsx(lt,{path:"/registration",element:o.jsx(_x,{})}),o.jsx(lt,{path:"/forgot-password",element:o.jsx(Mx,{})}),o.jsx(lt,{path:"/reset-password",element:o.jsx(Hx,{})}),o.jsx(lt,{path:"/redeem-invitation",element:o.jsx(Yx,{})}),o.jsx(lt,{path:"/user-profile",element:o.jsx(ty,{fallback:o.jsx(Ym,{to:"/login",replace:!0}),children:o.jsx(Xx,{})})}),o.jsx(lt,{path:"/terms",element:o.jsx(Kx,{})}),o.jsx(lt,{path:"/external-login-confirmation",element:o.jsx(Fx,{})}),o.jsx(lt,{path:"*",element:o.jsx(Ym,{to:"/",replace:!0})})]})})}Wg.createRoot(document.getElementById("root")).render(o.jsx(x.StrictMode,{children:o.jsx(yv,{children:o.jsx(ay,{})})}));
