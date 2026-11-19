# 手工诊断脚本

`node --test tests/*.test.mjs` 只跑 `*.test.mjs`。下面这些脚本文件名不带 `.test`，是给你在怀疑某条链断了、或者要回报实测结果时手动跑的。它们都会自己写覆盖层、跑烘焙、再还原，可以重复跑。

跑之前确认工作区干净：`git status data/` 应该是空的。跑完如果剩下 `data/overrides/`、`data/evidence/locations/amap-manual.json`，或者 `data/curated`、`data/generated` 有改动，说明脚本中途出错，用 `git checkout -- data/curated data/generated` 加 `rm -r data/overrides`、删掉 `amap-manual.json` 收拾。

## 覆盖层保存闸门的两列表

```
node tests/overrides-gate-report.mjs
```

对一条线索逐字段 patch、insert 一条线索、insert 一家医院、patch 医院名、remove 一家还挂着线索的医院，每个案例打印四行：烘焙结果、`test:data`、`data:validate`，以及保真断言为哪个字段让了路。改动 `tests/data-source.test.mjs` 的让路逻辑后跑一遍，看「让路的保真断言」那列有没有变成空或者多出不该有的项。

## 撤下一家机构

```
node tests/overrides-remove-flow.mjs     # 只撤机构（应被拦住）；连同名下线索一起撤
node tests/overrides-remove-move.mjs     # 把线索改挂到另一家机构，再撤原机构（应通过）
node tests/overrides-remove-probe.mjs    # 只撤回龙观，打印完整的 validate 硬错误
```

`remove` 只对**机构**有意义，而且必须先把它名下的线索改挂到别处：机构退役的正确做法是改挂后撤，不是删记录。线索本身要走 `patch status`（见下）。

## 让一条线索不再发布

```
node tests/overrides-withhold-probe.mjs
```

用 `patch status → withheld` 把一条线索从页面拿掉。`remove` 一条源表线索会让「表格每一行都进了库」那条断言必红——那条红是对的，表格里的行不该凭空消失。

## 覆盖层文件坏了

```
node tests/overrides-badjson-probe.mjs
```

写一个未闭合引号的覆盖文件，确认校验器把文件名点出来并停下。这类文件比你想象的常见：用 PowerShell 的 `ConvertTo-Json` 写中文会坏。写覆盖层一律用 node 的 `fs.writeFileSync(path, json, 'utf8')`。

## 地图上的线索数跟着数据走

```
node tests/map-leads-invariant-probe.mjs
```

`tests/map-coordinates.test.mjs` 里那条断言现在是派生的：图上各点的 `leads` 之和要等于「已发布且挂了机构」的线索条数，不写死 326。控制台撤下一条线索是合法操作，写死的常数一定过期，所以这里验的是「撤下后仍然成立」（326 → 325 后依旧绿）。反向那一半固定在测试体里：同一份数据少给一条 `leads`，断言必须变红——只做前者等于把断言删了。

## 新增机构能不能连着保存

```
node tests/overrides-insert-idempotent-probe.mjs
```

控制台的正常流程是「新增 → 定位 → 再保存」。烘焙必须对同一条 insert 反复稳定：连跑三次都 exit 0，第二次起 `hospitals.json` 逐字节不变。

判重的基准只能是**覆盖层之前**的派生集（`hospitalsFromRun` 的结果）。`hospitals.json` 是烘焙产物，里面本来就有 insert 出来的机构，拿它当基准再叠一遍同一条 insert，看到的就是「已是源记录」——第一次烘焙之后这条路自我否定。`tests/overrides-insert.test.mjs` 把这个陷阱固定下来了：同一个 insert 叠派生集两次结果一致，叠烘焙产物则必然报错。

`geocode-hospitals.ts --query/--pick` 走的是同一条合成（`hospitalsWithOverrides()`），所以新增机构烘焙之后还能继续查坐标、选落点。

## 新增机构能不能上图

```
node tests/overrides-manual-coordinate-probe.mjs
```

控制台建的新机构一开始没有坐标。跑 `geocode-hospitals.ts --query/--pick` 在图上选定落点后，`amap-manual.json` 里就有这条记录；烘焙时 `withManualCoordinates()` 会把它的 GCJ-02 值转回 WGS84 写进 `hospitals.json`（`coordinates_source: 'manual'`），`build-aggregates.ts` 再合成 `data/generated/locations.json`。这个脚本把整条链走一遍，打印「新增机构在库但 coordinates 为 null」「选定后 coordinates 与 coordinates_source」「locations.json 里的 manual 条目」「validate 结果」四段，最后还原。

坐标不是手写进 `hospitals.json` 的：`validate-data.ts` 用和烘焙同一个函数算比对基准，手写会被判成「与本轮高德定位依据不一致」。

## 机构坐标的出处只有两个

```
node tests/overrides-stray-coordinate-probe.mjs
```

坐标只能来自那轮高德定位的证据，或者 `amap-manual.json` 里人工选定的点。`data/overrides/hospitals/` 的新增记录两个都没有，所以 `lib/overrides.ts` 的 insert 分支直接拒：`set.coordinates` 或 `set.coordinates_source` 一出现就报「新增机构不能自带坐标，坐标只能来自高德查询与人工选定」。

`validate-data.ts` 再补一道网：`hospitals.json` 里 `coordinates` 非空的机构，必须在证据集或人工表里有一条 `status === 'geocoded'` 且带 `chosen` 的记录。判据和 `buildLocationIndex` 用同一份输入，所以这种记录以前要等到 `build-aggregates.ts` 合成页面坐标表才炸，现在保存后几秒的 `data:validate` 就红。

探针跑三条：自带坐标被拒、不带坐标能过且人工选定后来源是 `manual`、把人工表那条删掉后 `data:validate` 红。第三条预期两处同时红——比对基准里已经带了 `withManualCoordinates`；只红一处说明基准没跟人工表走。

## 哪些机构的人工选点会生效

```
node tests/overrides-pick-refusal-probe.mjs
```

`coordinates_source` 有三个值，人工选点的权限不一样：

- `geocoded`：高德按机构地址查到的点。人工选点**不覆盖**，`--pick` 打出「人工选点不覆盖」并以 exit 1 结束，`amap-manual.json` 一个字节都不写——不留下一个等着将来生效的废点。
- `province-centroid`：`place-hospitals.js` 填的省中心近似值，本来就等着被精确值替换。人工选点会覆盖它，来源改成 `manual`。
- `manual` / 没有坐标：接受，重选以新的为准。

这条探针拿一家 geocoded 机构跑一遍 `--pick`，检查输出里能看出「被拒绝」而不是无声跳过、人工表逐字节没变，再烘焙核对坐标没变。上面那张三值表由 `tests/coordinates-source.test.mjs` 逐条断言（`acceptsManualCoordinate()`）；盘上现在没有 province-centroid 的机构，那条路径只在单元测试里覆盖。
