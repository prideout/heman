// Copyright (c) 2012 Leonhard Gruenschloss (leonhard@gruenschloss.org)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

#ifndef HALTON_ENUM_H
#define HALTON_ENUM_H

#include <utility>
#include <cassert>

// Determine the index of the i-th sample falling into a pixel, based on the
// elementary interval property of the Halton sequence.
// This is an implementation of the two-dimensional case of the more general
// construction in L. Gruenschloss, M. Raab, and A. Keller: "Enumerating Quasi-Monte
// Carlo Point Sequences in Elementary Intervals".
// This assumes that identity digit permutations are used for the first two components,
// i.e. basis 2 and 3.
class Halton_enum
{
public:
    // Initialize the enumeration for the given resolution.
    Halton_enum(unsigned width, unsigned height);

    // Return how many samples per pixel can be queried before sample index overflow occurs.
    unsigned get_max_samples_per_pixel() const { return ~0u / m_increment; }

    // Return the index of the i-th sample falling into the given pixel (x, y) within the
    // previously given resolution bounds. i must be smaller than the value returned by
    // get_max_samples_per_pixel.
    unsigned get_index(unsigned i, unsigned x, unsigned y) const;

    // Scale the x-component of a sample in [0,1) to [0,width).
    float scale_x(float x) const;

    // Scale the y-component of a sample in [0,1) to [0,height).
    float scale_y(float y) const;

private:
    static std::pair<int, int> extended_euclid(int a, int b);
    static unsigned halton2_inverse(unsigned i, unsigned digits);
    static unsigned halton3_inverse(unsigned i, unsigned digits);

    unsigned m_p2; // Smallest integer with 2^m_p2 >= width.
    unsigned m_p3; // Smallest integer with 3^m_p3 >= height.
    unsigned m_x; // 3^m_p3 * ((2^m_p2)^(-1) mod 3^m_p3).
    unsigned m_y; // 2^m_p2 * ((3^m_p3)^(-1) mod 2^m_p2).
    float m_scale_x; // 2^m_p2.
    float m_scale_y; // 3^m_p3.
    unsigned m_increment; // Product of prime powers, i.e. m_res2 * m_res3.
};

inline Halton_enum::Halton_enum(const unsigned width, const unsigned height)
{
    assert(width && height);

    m_p2 = 0;
    unsigned w = 1;
    while (w < width) // Find 2^m_p2 >= width.
    {
        ++m_p2;
        w *= 2;
    }
    m_scale_x = float(w);

    m_p3 = 0;
    unsigned h = 1;
    while (h < height) // Find 3^m_p3 >= height.
    {
        ++m_p3;
        h *= 3;
    }
    m_scale_y = float(h);

    m_increment = w * h; // There's exactly one sample per pixel.

    // Determine the multiplicative inverses.
    const std::pair<int, int> inv = extended_euclid(static_cast<int>(h), static_cast<int>(w));
    const unsigned inv2 = (inv.first < 0) ? (inv.first + w) : (inv.first % w);
    const unsigned inv3 = (inv.second < 0) ? (inv.second + h) : (inv.second % h);
    assert((!inv2 && w == 1) || (inv2 > 0 && (h * inv2) % w == 1));
    assert((!inv3 && h == 1) || (inv3 > 0 && (w * inv3) % h == 1));
    m_x = h * inv2;
    m_y = w * inv3;
}

inline unsigned Halton_enum::get_index(const unsigned i, const unsigned x, const unsigned y) const
{
    // Promote to 64 bits to avoid overflow.
    const unsigned long long hx = halton2_inverse(x, m_p2);
    const unsigned long long hy = halton3_inverse(y, m_p3);
    // Apply Chinese remainder theorem.
    const unsigned offset = static_cast<unsigned>((hx * m_x + hy * m_y) % m_increment);
    return offset + i * m_increment;
}

inline float Halton_enum::scale_x(const float x) const
{
    return x * m_scale_x;
}

inline float Halton_enum::scale_y(const float y) const
{
    return y * m_scale_y;
}

inline std::pair<int, int> Halton_enum::extended_euclid(const int a, const int b)
{
    if (!b)
        return std::make_pair(1u, 0u);
    const int q = a / b;
    const int r = a % b;
    const std::pair<int, int> st = extended_euclid(b, r);
    return std::make_pair(st.second, st.first - q * st.second);
}

inline unsigned Halton_enum::halton2_inverse(unsigned index, const unsigned digits)
{
    index = (index << 16) | (index >> 16);
    index = ((index & 0x00ff00ff) << 8) | ((index & 0xff00ff00) >> 8);
    index = ((index & 0x0f0f0f0f) << 4) | ((index & 0xf0f0f0f0) >> 4);
    index = ((index & 0x33333333) << 2) | ((index & 0xcccccccc) >> 2);
    index = ((index & 0x55555555) << 1) | ((index & 0xaaaaaaaa) >> 1);
    return index >> (32 - digits);
}

inline unsigned Halton_enum::halton3_inverse(unsigned index, const unsigned digits)
{
    unsigned result = 0;
    for (unsigned d = 0; d < digits; ++d)
    {
        result = result * 3 + index % 3;
        index /= 3;
    }
    return result;
}

#endif // HALTON_ENUM_H

