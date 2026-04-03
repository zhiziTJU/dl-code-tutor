# 深度学习最佳实践

本文档总结了深度学习中的常见最佳实践，用于代码审查和改进建议。

## 模型架构

### 层的顺序

**卷积层中正确的顺序**：
```python
# ✅ 正确
x = conv(x)
x = batch_norm(x)
x = activation(x)

# ❌ 错误
x = conv(x)
x = activation(x)
x = batch_norm(x)
```

### 残差连接

**正确的残差块实现**：
```python
# ✅ 正确：激活在残差相加之后
out = bn2(conv2(relu(bn1(conv1(x))))))
out = out + shortcut
out = relu(out)

# ❌ 错误：激活在残差相加之前
out = relu(bn2(conv2(relu(bn1(conv1(x)))))))
out = out + shortcut
```

### 权重初始化

```python
import torch.nn as nn

# ✅ 使用合适的初始化
def init_weights(m):
    if isinstance(m, nn.Conv2d):
        nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
    elif isinstance(m, nn.Linear):
        nn.init.xavier_uniform_(m.weight)
        if m.bias is not None:
            nn.init.zeros_(m.bias)

model.apply(init_weights)

# ❌ 使用默认初始化（可能导致训练不稳定）
```

## 训练流程

### 学习率调度

```python
# ✅ 使用学习率调度器
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
    optimizer, T_max=100, eta_min=1e-6
)

# 或
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5, patience=10
)

# ❌ 使用固定学习率（可能后期震荡或收敛慢）
```

### 梯度裁剪

```python
# ✅ 使用梯度裁剪防止梯度爆炸
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

# 特别适用于 RNN/Transformer
```

### 混合精度训练

```python
# ✅ 使用混合精度训练加速并减少内存
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for batch in dataloader:
    optimizer.zero_grad()

    with autocast():
        loss = model(batch)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()

# 可以加速 2-3 倍，减少 50% 内存使用
```

## 数据处理

### 数据归一化

```python
# ✅ 使用数据集的均值和标准差进行归一化
normalize = transforms.Normalize(
    mean=[0.485, 0.456, 0.406],  # ImageNet 均值
    std=[0.229, 0.224, 0.225]    # ImageNet 标准差
)

# ❌ 不归一化或使用错误的归一化参数
```

### 数据增强

```python
# ✅ 训练时使用数据增强
train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean, std)
])

# 测试时不使用数据增强
test_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean, std)
])
```

## 常见陷阱

### 1. 忘记设置 eval() 模式

```python
# ✅ 正确
model.eval()
with torch.no_grad():
    output = model(input)

# ❌ 错误：忘记 eval() 会影响 BatchNorm 和 Dropout
```

### 2. Label Smoothing

```python
# ✅ 使用 Label Smoothing 防止过拟合
criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

# 特别适用于：训练集较小、模型较大时
```

### 3. 梯度累积

```python
# ✅ 使用梯度累积模拟更大的 batch size
accumulation_steps = 4

for i, batch in enumerate(dataloader):
    loss = model(batch) / accumulation_steps
    loss.backward()

    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

### 4. Early Stopping

```python
# ✅ 实现 Early Stopping
class EarlyStopping:
    def __init__(self, patience=10, min_delta=0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                return True
        else:
            self.best_loss = val_loss
            self.counter = 0
        return False
```

## 性能优化

### 1. DataLoader 配置

```python
# ✅ 优化 DataLoader
dataloader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=4,        # 多进程加载数据
    pin_memory=True,      # 加速 GPU 转移
    prefetch_factor=2,    # 预取批次
    persistent_workers=True  # 保持 worker 进程
)
```

### 2. 模型并行（多 GPU）

```python
# ✅ 使用 DataParallel
model = nn.DataParallel(model)

# 或更好的 DistributedDataParallel
from torch.nn.parallel import DistributedDataParallel as DDP
model = DDP(model, device_ids=[local_rank])
```

## 调试技巧

### 1. 过拟合单个 Batch

```python
# 首先确保模型能够过拟合单个 batch
# 如果不能，说明模型或代码有问题
```

### 2. 检查梯度

```python
# 检查梯度是否正常
for name, param in model.named_parameters():
    if param.grad is not None:
        print(f"{name}: grad mean={param.grad.mean():.6f}, std={param.grad.std():.6f}")
```

### 3. 监控指标

```python
# 监控多个指标，不只是 loss
metrics = {
    'train_loss': [],
    'train_acc': [],
    'val_loss': [],
    'val_acc': [],
    'learning_rate': []
}
```

## 代码组织

### 推荐的项目结构

```
project/
├── models/
│   ├── __init__.py
│   ├── resnet.py
│   └── transformer.py
├── data/
│   ├── __init__.py
│   └── dataset.py
├── utils/
│   ├── __init__.py
│   ├── train.py
│   └── metrics.py
├── configs/
│   └── config.yaml
└── train.py
```

### 配置文件

```python
# ✅ 使用配置文件管理超参数
import yaml

with open('configs/config.yaml') as f:
    config = yaml.safe_load(f)

# ❌ 硬编码超参数
```

## 安全性检查清单

在代码审查时，检查以下项目：

- [ ] BatchNorm 的位置是否正确
- [ ] 激活函数的位置是否正确
- [ ] 是否使用了适当的权重初始化
- [ ] 是否使用了学习率调度器
- [ ] 是否实现了 early stopping
- [ ] 是否正确处理了 train/eval 模式切换
- [ ] 是否正确设置了 random seed
- [ ] 数据是否正确归一化
- [ ] 是否使用了梯度裁剪（特别是 RNN）
- [ ] 是否检查了梯度是否为 NaN
- [ ] 是否保存了模型 checkpoint
- [ ] 是否记录了训练日志

---

**最后更新**：2026-04-03
