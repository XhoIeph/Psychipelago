# 手工诊断脚本

`node --test tests/*.test.mjs` 只跑 `*.test.mjs`。下面这些脚本文件名不带 `.test`，是给你在怀疑某条链断了、或者要回报实测结果时手动跑的。它们都会自己写覆盖层、跑烘焙、再还原，可以重复跑。

跑之前确认工作区干净：`git status data/` 只应该有 `?? data/generated/locations.json`（生成物）。跑完如果剩下 `data/overrides/` 或 `data/curated` 有改动，说明脚本中途出错，用 `git checkout -- data/curated` 加 `rm -r data/overrides` 收拾。

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
