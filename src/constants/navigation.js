import { Activity, BarChart3, Beaker, Boxes, Calculator, ClipboardList, CloudUpload, Droplets, FileSpreadsheet, FileUp, Flame, History, LayoutDashboard, Layers, ListChecks, MapPinned, Palette, QrCode, RefreshCw, Route, Search, Truck, Warehouse, Waves, Wind } from 'lucide-react';
export const NAV_GROUPS = [
 {label:'Overview',items:[{title:'Dashboard',path:'/',icon:LayoutDashboard}]},
 {label:'Orders',items:[
   {title:'All Orders',path:'/orders/all',icon:Search},
  //  {title:'Order Tracker',path:'/orders/tracker',icon:Route},
  {title:'Order Tracker',path:'/production/tracker',icon:Route},
   {title:'Dyeing Programs',path:'/dyeing-programs',icon:Palette},
 ]},
 {label:'Inventory',items:[{title:'PO Planner',path:'/unit3/po-planner',icon:ClipboardList},{title:'Greige Stock',path:'/stock/greige',icon:Boxes},{title:'Job Card Lots',path:'/stock/job-card-lots',icon:Layers},{title:'Yarn Stock',path:'/stock/yarn',icon:Warehouse},{title:'Recipes',path:'/recipes',icon:Beaker}]},
 {label:'Production',items:[
   {title:'Dyes & Chemicals',path:'/production/dyes-issue',icon:Droplets,allowedRoles:['dyeing','jobcard']},
   {title:'Jet Loading',path:'/production/jet-loading',icon:Waves,allowedRoles:['dyeing','jobcard']},
   {title:'Rope Opener',path:'/production/rope-opener',icon:Wind,allowedRoles:['dyeing','jobcard']},
   {title:'Heat Setting',path:'/production/heat-setting',icon:Flame,allowedRoles:['dyeing','jobcard']},
   {title:'Stenter Finishing',path:'/production/stenter-loading',icon:Layers,allowedRoles:['dyeing','jobcard']},
 ]},
 {label:'Reports',items:[{title:'Dyeing Schedule Summary',path:'/reports/greige-requisition',icon:ClipboardList}, {title:'Dyeing In Progress',path:'/production/in-progress',icon:Activity},{title:'Job Cards Issued',path:'/reports/greige-issued',icon:ListChecks}, {title:'Daily Records',path:'/production/records',icon:BarChart3},{title:'Last Imports (LUD)',path:'/reports/lud',icon:History}]},
 {label:'ERP Imports',items:[
   {title:'Orders Book',path:'/imports/orders-book',icon:FileUp,allowedRoles:['order']},
   {title:'Dyeing Schedules',path:'/imports/dyeing-programs',icon:FileUp,allowedRoles:['dyeing']},
   {title:'Greige Stock U-2',path:'/imports/greige-stock-u2',icon:CloudUpload,allowedRoles:['unit2']},
   {title:'Greige Stock U-3',path:'/imports/greige-stock-u3',icon:CloudUpload,allowedRoles:['unit3']},
   {title:'PO Planner U-3',path:'/imports/knitting-po-planning',icon:FileUp,allowedRoles:['unit3','yarn']},
   {title:'Yarn Stock',path:'/imports/yarn-stock',icon:FileSpreadsheet,allowedRoles:['yarn']},
   {title:'Open Job Cards',path:'/imports/job-cards-opening',icon:FileUp,allowedRoles:['jobcard']},
   {title:'Closed Job Cards',path:'/imports/job-cards-closing',icon:FileUp,allowedRoles:['closing']},
   {title:'Dispatch Register',path:'/imports/dispatch',icon:Truck,allowedRoles:['billing']},
   {title:'Recipes',path:'/imports/recipes',icon:Beaker,allowedRoles:['recipe']},
 ]},
 {label:'Tools',items:[{title:'GSM Calculator',path:'/tools/gsm',icon:Calculator},{title:'QR Labels',path:'/tools/qr',icon:QrCode},
  // {title:'Fabric Name Mapping',path:'/tools/fabric-mapping',icon:MapPinned,allowedRoles:['unit2','unit3']},
 {title:'Refresh Data',path:'/tools/refresh-cache',icon:RefreshCw}]},
];
export const ALL_NAV_ITEMS=NAV_GROUPS.flatMap(g=>g.items.map(item=>({...item,group:g.label})));
export { canAccess } from '@/constants/permissions';
export function findNavItem(pathname){return ALL_NAV_ITEMS.find(x=>x.path===pathname);}
