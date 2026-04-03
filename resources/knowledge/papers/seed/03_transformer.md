# Attention Is All You Need (Transformer)

**作者**：Ashish Vaswani, Noam Shazeer, Niki Parmar, et al.
**发表时间**：2017
**会议**：NeurIPS 2017
**arXiv**：https://arxiv.org/abs/1706.03762
**代码仓库**：https://github.com/tensorflow/tensor2tensor

## 摘要

本文提出了 Transformer 架构，完全基于注意力机制，摒弃了循环和卷积。Transformer 在机器翻译任务上取得了更好的效果，同时训练效率更高。它成为了现代 NLP 的基础架构。

## 核心贡献

1. **提出了自注意力机制**：让模型能够直接关注序列中的任意位置
2. **完全基于注意力**：摒弃了 RNN 和 CNN，实现了更好的并行性
3. **多头注意力**：从不同的表示子空间关注信息
4. **位置编码**：注入序列的位置信息

## 关键方法

### 缩放点积注意力（Scaled Dot-Product Attention）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class ScaledDotProductAttention(nn.Module):
    def __init__(self, temperature, attn_dropout=0.1):
        super(ScaledDotProductAttention, self).__init__()
        self.temperature = temperature
        self.dropout = nn.Dropout(attn_dropout)

    def forward(self, q, k, v, mask=None):
        # q, k, v: (batch_size, n_heads, seq_len, d_k)
        attn = torch.matmul(q / self.temperature, k.transpose(2, 3))

        if mask is not None:
            attn = attn.masked_fill(mask == 0, -1e9)

        attn = self.dropout(F.softmax(attn, dim=-1))
        output = torch.matmul(attn, v)

        return output, attn
```

### 多头注意力（Multi-Head Attention）

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, n_heads, d_model, d_k, d_v, dropout=0.1):
        super(MultiHeadAttention, self).__init__()
        self.n_heads = n_heads
        self.d_k = d_k
        self.d_v = d_v

        self.w_qs = nn.Linear(d_model, n_heads * d_k, bias=False)
        self.w_ks = nn.Linear(d_model, n_heads * d_k, bias=False)
        self.w_vs = nn.Linear(d_model, n_heads * d_v, bias=False)

        self.attention = ScaledDotProductAttention(temperature=d_k ** 0.5)
        self.fc = nn.Linear(n_heads * d_v, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, q, k, v, mask=None):
        batch_size = q.size(0)

        # 线性变换并分割成多头
        q = self.w_qs(q).view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        k = self.w_ks(k).view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        v = self.w_vs(v).view(batch_size, -1, self.n_heads, self.d_v).transpose(1, 2)

        # 应用注意力
        attn_output, attn = self.attention(q, k, v, mask=mask)

        # 合并多头
        attn_output = attn_output.transpose(1, 2).contiguous()
        attn_output = attn_output.view(batch_size, -1, self.n_heads * self.d_v)

        # 最终线性变换
        output = self.fc(attn_output)
        return output, attn
```

### 位置编码（Positional Encoding）

```python
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()

        # 创建位置编码矩阵
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() *
                            (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        self.register_buffer('pe', pe.unsqueeze(0))

    def forward(self, x):
        # x: (batch_size, seq_len, d_model)
        return x + self.pe[:, :x.size(1)]
```

### Feed-Forward Network

```python
class PositionwiseFeedForward(nn.Module):
    def __init__(self, d_model, d_ff, dropout=0.1):
        super(PositionwiseFeedForward, self).__init__()
        self.w_1 = nn.Linear(d_model, d_ff)
        self.w_2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        return self.w_2(self.dropout(F.relu(self.w_1(x))))
```

### Encoder Layer

```python
class EncoderLayer(nn.Module):
    def __init__(self, d_model, d_ff, n_heads, dropout=0.1):
        super(EncoderLayer, self).__init__()
        self.self_attn = MultiHeadAttention(n_heads, d_model, d_model // n_heads,
                                          d_model // n_heads, dropout)
        self.feed_forward = PositionwiseFeedForward(d_model, d_ff, dropout)

        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)

    def forward(self, x, mask=None):
        # 自注意力 + 残差连接 + LayerNorm
        x2, _ = self.self_attn(x, x, x, mask)
        x = x + self.dropout1(x2)
        x = self.norm1(x)

        # 前馈网络 + 残差连接 + LayerNorm
        x2 = self.feed_forward(x)
        x = x + self.dropout2(x2)
        x = self.norm2(x)

        return x
```

## 关键设计要点

### 1. 残差连接和 LayerNorm
- 注意：顺序是 `x + LayerNorm(Sublayer(x))` 或 `LayerNorm(x + Sublayer(x))`
- 论文中使用后者：`LayerNorm(x + Sublayer(x))`

### 2. 缩放因子
- 注意力分数除以 √d_k（dk 是 key 的维度）
- 防止 softmax 在高维时梯度消失

### 3. 位置编码
- 使用 sin/cos 函数
- 可以处理比训练时更长的序列

### 4. Mask
- Padding mask：屏蔽填充位置
- Look-ahead mask：屏蔽未来位置（decoder）

## 常见实现错误

1. ❌ 残差连接和 LayerNorm 的顺序错误
2. ❌ 忘记应用缩放因子（除以 √d_k）
3. ❌ softmax 维度错误
4. ❌ 位置编码没有正确广播
5. ❌ mask 的形状不正确
6. ❌ 多头注意力的维度计算错误

## 代码审查要点

审查 Transformer 代码时，检查：

- [ ] 残差连接是否正确（x + sublayer(x)）
- [ ] LayerNorm 是否在残差之后应用
- [ ] 注意力是否正确缩放（除以 √d_k）
- [ ] 位置编码是否正确添加
- [ ] mask 是否正确应用（注意维度）
- [ ] 多头的维度是否正确
- [ ] 是否使用了正确的初始化（xavier uniform）

## 超参数

| 超参数 | Base | Big |
|--------|------|-----|
| d_model | 512 | 1024 |
| d_ff | 2048 | 4096 |
| n_heads | 8 | 16 |
| n_layers | 6 | 6 |
| dropout | 0.1 | 0.3 |

## 适用场景

- 机器翻译
- 文本分类
- 问答系统
- 文本生成
- 预训练语言模型（BERT, GPT）

## 后续发展

- **BERT**：双向编码器表示
- **GPT**：生成式预训练 Transformer
- **T5**：文本到文本转换 Transformer
- **ViT**：Vision Transformer（用于图像）
- **Efficient Transformer**：稀疏注意力变体

## 标签

#论文 #NLP #Transformer #注意力机制 #深度学习
