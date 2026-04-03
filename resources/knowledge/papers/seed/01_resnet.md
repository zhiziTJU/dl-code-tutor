# Deep Residual Learning for Image Recognition (ResNet)

**作者**：Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun
**发表时间**：2015
**会议**：CVPR 2016
**arXiv**：https://arxiv.org/abs/1512.03385
**代码仓库**：https://github.com/KaimingHe/deep-residual-networks

## 摘要

深度神经网络通常难以训练，因为存在梯度消失/爆炸问题。本文提出了残差学习框架，通过引入跳跃连接（skip connection）来解决深层网络的训练困难。ResNet-152 在 ImageNet 上达到了 3.57% 的 top-5 错误率。

## 核心贡献

1. **提出了残差学习框架**：让层学习残差映射而不是直接学习目标映射
2. **引入跳跃连接**：解决梯度消失问题，让梯度更容易传播
3. **证明了深度网络的有效性**：152层网络比浅层网络表现更好

## 关键方法

### 残差块（Residual Block）

基本思想是让层学习残差函数 F(x) = H(x) - x，而不是直接学习目标映射 H(x)。通过跳跃连接，原始输入 x 被直接加到输出上。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super(ResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3,
                               stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3,
                               stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)

        # 快捷连接（shortcut）
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1,
                         stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)  # 残差连接
        out = F.relu(out)
        return out
```

### ResNet 架构

```python
class ResNet(nn.Module):
    def __init__(self, block, layers, num_classes=1000):
        super(ResNet, self).__init__()
        self.in_channels = 64

        # 初始卷积层
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        # 残差层
        self.layer1 = self._make_layer(block, 64, layers[0])
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(block, 512, layers[3], stride=2)

        # 分类层
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(512, num_classes)

    def _make_layer(self, block, out_channels, blocks, stride=1):
        layers = []
        layers.append(block(self.in_channels, out_channels, stride))
        self.in_channels = out_channels
        for _ in range(1, blocks):
            layers.append(block(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        return x
```

## 关键设计要点

### 1. Batch Normalization 位置
- **正确**：在卷积之后、激活函数之前
- **错误**：在激活函数之后

### 2. 快捷连接（Shortcut）
- 当维度不匹配时，使用 1x1 卷积调整维度
- 不要忘记在快捷连接中使用 BatchNorm

### 3. 激活函数
- 使用 ReLU 激活函数
- 激活函数应该在残差相加**之后**应用

### 4. 权重初始化
- 使用 kaiming 初始化（针对 ReLU）

## 常见实现错误

1. ❌ 在 shortcut 中忘记使用 BatchNorm
2. ❌ 激活函数位置错误（在相加之前应用）
3. ❌ 残差块的 stride 处理不当
4. ❌ 卷积层忘记设置 bias=False（因为有 BN）
5. ❌ 维度匹配错误导致相加失败

## 代码审查要点

当审查类似 ResNet 的代码时，检查：

- [ ] shortcut 连接是否正确实现
- [ ] BN 层的位置是否正确（conv → bn → relu）
- [ ] 维度匹配是否正确处理
- [ ] 是否使用了适当的初始化（kaiming）
- [ ] 最后的相加操作是否在激活之前
- [ ] 是否在训练和评估模式间正确切换（model.train() / model.eval()）

## 适用场景

- 图像分类
- 目标检测（作为 backbone）
- 语义分割（作为 backbone）
- 其他需要深层网络的视觉任务

## 变体

- **ResNet-50/101/152**：常用的深度版本
- **ResNet-V2**：改进版，BN 和 ReLU 位置不同
- **Pre-activation ResNet**：预激活版本
- **ResNeXt**：使用分组卷积的扩展

## 标签

#论文 #CV #CNN #残差学习 #图像分类 #深度学习
